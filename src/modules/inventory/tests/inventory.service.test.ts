import "reflect-metadata";
import { ObjectId } from "mongodb";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import Inventory, {
  InventoryStatus,
} from "../../../database/models/inventory.model";
import User from "../../../database/models/user.model";
import { NotFoundError, BadRequestError } from "routing-controllers";
import { PaystackService } from "../../shared/http/paystack.service";
import { createDiScopedContainer } from "../../shared/utils";
import InventoryService from "../inventory.service";
import { PaymentProcessor } from "../../../database/models/payment.model";
import { ConfigService } from "../../../configuration";
import Container from "typedi";

async function setup() {
  const user = await User.create({
    email: "user@example.com",
    emailVerified: true,
    name: "John doe",
    password: "hashedPassword",
  });

  const auth = { userId: user._id.toString(), email: user.email };
  return { user, auth };
}

class MockConfigService {
  getRequired(key: string) {
    const mockConfig: Record<string, string> = {
      paystackApiKey: "test_private_key",
    };
    return mockConfig[key];
  }
}

Container.set(ConfigService, new MockConfigService());

describe("InventoryService", () => {
  let service: InventoryService;
  let paystackServiceMock: jest.Mocked<PaystackService>;

  beforeEach(() => {
    const container = createDiScopedContainer();
    container.set(ConfigService, new MockConfigService());

    paystackServiceMock = {
      initializePayment: jest.fn(),
    } as unknown as jest.Mocked<PaystackService>;

    container.set(PaystackService, paystackServiceMock);

    service = new InventoryService(paystackServiceMock);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new inventory item", async () => {
      const { auth } = await setup();
      const dto = {
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
      };

      const result = await service.create(auth, dto);

      expect(result._id).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.category).toBe(dto.category);
      expect(result.price).toBe(dto.price);
      expect(result.quantity).toBe(dto.quantity);
      expect(result.sku).toBe(dto.sku);
    });
  });

  describe("findAll", () => {
    it("should return paginated inventory items", async () => {
      const { user } = await setup();

      const mockInventory1 = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: user._id,
      });
      const mockInventory2 = await Inventory.create({
        name: "Item2",
        category: "Category2",
        price: 200,
        currency: "USD",
        quantity: 50,
        sku: "ELE-1101011",
        createdBy: user._id,
      });

      const query = { name: "Item", page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.docs.length).toBe(2);
      expect(result.docs[0]._id.toString()).toBe(mockInventory2._id.toString());
      expect(result.docs[1]._id.toString()).toBe(mockInventory1._id.toString());
    });

    it("should handle empty inventory", async () => {
      const query = { name: "Nonexistent", page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.docs.length).toBe(0);
    });
  });

  describe("findOne", () => {
    it("should return a single inventory item", async () => {
      const userId = new ObjectId();
      const mockInventory = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: userId,
      });

      const result = await service.findOne(mockInventory._id.toString());

      expect(result).toEqual(expect.objectContaining({ name: "Item1" }));
      expect(result?._id.toString()).toBe(mockInventory._id.toString());
    });

    it("should throw not found error if the item is not found", async () => {
      await expect(service.findOne(new ObjectId().toString())).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("update", () => {
    it("should update an inventory item", async () => {
      const { auth } = await setup();
      const mockInventory = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: auth.userId,
      });

      const dto = { name: "Updated Item" };
      const result = await service.update(
        auth,
        mockInventory._id.toString(),
        dto
      );

      expect(result?.name).toBe("Updated Item");
      expect(result?._id.toString()).toBe(mockInventory._id.toString());
    });

    it("should throw error if inventory item is not found", async () => {
      const { auth } = await setup();
      const dto = { name: "Updated Item" };

      await expect(
        service.update(auth, new ObjectId().toString(), dto)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error if user is not authorized", async () => {
      const { auth } = await setup();
      const createdBy = new ObjectId();
      const mockInventory = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: createdBy,
      });

      const dto = { name: "Updated Item" };

      await expect(
        service.update(auth, mockInventory._id.toString(), dto)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("remove", () => {
    it("should mark an inventory item as discontinued", async () => {
      const { auth } = await setup();

      const mockInventory = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: auth.userId,
      });

      const result = await service.remove(auth, mockInventory._id.toString());

      expect(result?.status).toBe(InventoryStatus.Discontinued);
    });

    it("should throw error if user is not the creator", async () => {
      const { auth } = await setup();

      const mockInventory = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: new ObjectId(),
      });

      await expect(
        service.remove(auth, mockInventory.id)
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw error when trying to remove non-existent inventory", async () => {
      const { auth } = await setup();
      await expect(
        service.remove(auth, new ObjectId().toString())
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("initiatePayment", () => {
    it("should initialize payment via Paystack", async () => {
      const { auth } = await setup();
      const mockInventory = await Inventory.create({
        name: "Item1",
        category: "Category1",
        price: 100,
        currency: "NGN",
        quantity: 100,
        sku: "ELE-1101010",
        createdBy: new ObjectId(),
      });

      const mockPaymentResponse = {
        data: {
          reference: "pay_ref_123",
          authorization_url: "https://checkout.paystack.com/pay_ref_123",
        },
      };

      paystackServiceMock.initializePayment.mockResolvedValue(
        mockPaymentResponse
      );

      const dto = {
        inventory: mockInventory.id,
        processor: PaymentProcessor.Paystack,
      };

      const result = await service.initiatePayment(auth, dto);

      expect(result).toEqual({
        processor: "paystack",
        status: "pending",
        reference: "pay_ref_123",
        checkoutUrl: "https://checkout.paystack.com/pay_ref_123",
      });
    });

    it("should throw an error if the inventory is not found", async () => {
      const auth = {
        userId: new ObjectId().toString(),
        email: "user@example.com",
      };
      const dto = {
        inventory: new ObjectId().toString(),
        processor: PaymentProcessor.Paystack,
      };

      await expect(service.initiatePayment(auth, dto)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
