import { createId, init } from "@paralleldrive/cuid2";
import { BadRequestError, NotFoundError } from "routing-controllers";
import { Service } from "typedi";
import Inventory, { IInventory, InventoryStatus } from "../../database/models/inventory.model";
import {
  CreateInventoryDto,
  GetInventoryPayments,
  InitiatePaymentDto,
  QueryInventoryDto,
  UpdateInventoryDto
} from "./dto/inventory.dto";
import { PaystackService } from "../shared/http/paystack.service";
import Payment, { InventoryItemMetadata, PaymentProcessor, PaymentScope } from "../../database/models/payment.model";
import User from "../../database/models/user.model";
import { escapeRegExp } from "../shared/utils";

@Service()
export default class InventoryService {
  constructor(private paystack: PaystackService) {}

  async create(auth: AuthData, dto: CreateInventoryDto): Promise<IInventory> {
    if (dto.sku) {
      dto.sku = this.generateSKU(dto.category);
    }

    const newInventory = await Inventory.create({
      ...dto,
      createdBy: auth.userId,
    });

    return newInventory.toObject();
  }

  async findAll(query: QueryInventoryDto) {
    const {
      name,
      category,
      status,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = query;

    const filter: any = { status: { $ne: InventoryStatus.Discontinued } };

    // TODO: create search index for category and name
    if (name) filter.name = new RegExp(escapeRegExp(name), "i");
    if (category) filter.category = new RegExp(escapeRegExp(category), "i");

    if (status) filter.status = status;
    if (minPrice) filter.price = { $gte: minPrice };
    if (maxPrice) filter.price = { ...filter.price, $lte: maxPrice };


    return await Inventory.paginate(filter,
      {
        select: 'name status sku category images',
        page,
        limit,
        sort: "-createdAt",
      }
    );
  }

  async findOne(id: string) {
    const inventory = await Inventory.findById(id).lean()
    if (!inventory) {
      throw new NotFoundError("Inventory not found")
    }

    return inventory
  }

  async update(
    auth: AuthData,
    id: string,
    dto: UpdateInventoryDto
  ) {
    const inventory = await Inventory.findById(id)
    if (!inventory) {
      throw new NotFoundError("Inventory not found")
    }

    if (!inventory.createdBy.equals(auth.userId)) {
      throw new BadRequestError("You can not edit this inventory")
    }

    return await Inventory.findByIdAndUpdate(id, dto, {
      new: true,
    })
  }

  async remove(auth: AuthData, id: string) {
    const inventory = await Inventory.findById(id)
    if (!inventory) {
      throw new NotFoundError("Inventory not found")
    }

    if (!inventory.createdBy.equals(auth.userId)) {
      throw new BadRequestError("You can not discontinue this inventory")
    }

    return Inventory.findByIdAndUpdate(
      id,
      { status: InventoryStatus.Discontinued },
      { new: true }
    ).lean();
  }

  async initiatePayment(auth: AuthData, payload: InitiatePaymentDto) {
    const [inventory, user] = await Promise.all([
      Inventory.findById(payload.inventory),
      User.findById(auth.userId).select("email"),
    ]);
    if (!inventory) {
      throw new NotFoundError("Item not found");
    }
    if (!user) {
      throw new BadRequestError("User not found");
    }

    if (inventory.status !== InventoryStatus.Available || !inventory.quantity) {
      throw new BadRequestError("Inventory is not available");
    }

    if (inventory.createdBy.equals(user._id)) {
      throw new BadRequestError("You can not pay for your own inventory item")
    }

    if (payload.processor === PaymentProcessor.Paystack) {
      const metadata: InventoryItemMetadata = {
        intent: PaymentScope.InventoryItemPayment,
        inventory: payload.inventory,
        user: auth.userId,
      };

      const result = await this.paystack.initializePayment({
        email: user.email,
        amount: inventory.price,
        currency: inventory.currency,
        reference: `inv_${createId()}`,
        metadata,
      });

      return {
        processor: payload.processor,
        status: "pending",
        reference: result.data.reference,
        checkoutUrl: result.data.authorization_url,
      };
    }

    throw new NotFoundError("Invalid payment method");
  }

  async getInventoryPayments(auth: AuthData, query: GetInventoryPayments) {
    const payments = await Payment.paginate({ user: auth.userId }, {
      page: query.page,
      select: 'status reference amount currency',
      populate: [{path: 'inventory', select: 'name description'}]
    })

    return payments;
  }

  private generateSKU(category: string) {
    const categoryCode = category.slice(0, 3).toUpperCase();
    const uniqueId = init({ length: 6 })(); 
    return `${categoryCode}-${uniqueId}`;
  }
}
