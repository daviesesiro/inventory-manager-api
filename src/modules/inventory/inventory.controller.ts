import {
  Body,
  Delete,
  Get,
  JsonController,
  Param,
  Post,
  Put,
  QueryParams,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";
import { IInventory } from "../../database/models/inventory.model";
import { GetAuthUser } from "../shared/decorators/auth-user.decorator";
import { AuthGuard } from "../shared/middlewares/auth-guard.middleware";
import {
  CreateInventoryDto,
  GetInventoryPayments,
  InitiatePaymentDto,
  QueryInventoryDto,
  UpdateInventoryDto,
} from "./dto/inventory.dto";
import InventoryService from "./inventory.service";

@Service()
@UseBefore(AuthGuard)
@JsonController("/inventory", { transformResponse: false })
export default class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("/payments")
  async getPayments(
    @GetAuthUser() auth: AuthData,
    @QueryParams() query: GetInventoryPayments
  ) {
    return this.inventoryService.getInventoryPayments(auth, query);
  }
  
  @Post("/")
  async create(@GetAuthUser() auth: AuthData, @Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(auth, dto);
  }

  @Get("/")
  async findAll(@QueryParams() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get("/:id")
  async findOne(@Param("id") id: string): Promise<IInventory | null> {
    return this.inventoryService.findOne(id);
  }

  @Put("/:id")
  async update(
    @GetAuthUser() auth: AuthData,
    @Param("id") id: string,
    @Body() updateInventoryDto: UpdateInventoryDto
  ) {
    return this.inventoryService.update(auth, id, updateInventoryDto);
  }

  @Delete("/:id")
  async remove(@GetAuthUser() auth: AuthData, @Param("id") id: string) {
    return this.inventoryService.remove(auth, id);
  }

  @Post("/:id/payments")
  async initiatePayment(
    @GetAuthUser() auth: AuthData,
    @Body() dto: InitiatePaymentDto,
    @Param("id") id: string
  ) {
    dto.inventory = id;
    return this.inventoryService.initiatePayment(auth, dto);
  }
}
