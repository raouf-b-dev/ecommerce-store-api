import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/primary-adapters/decorators/require-permissions.decorator';
import { CallerCtx } from '../auth/primary-adapters/decorators/caller-context.decorator';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { CreateCustomerDto } from './primary-adapters/dto/create-customer.dto';
import { UpdateCustomerDto } from './primary-adapters/dto/update-customer.dto';
import { AddAddressDto } from './primary-adapters/dto/add-address.dto';
import { UpdateAddressDto } from './primary-adapters/dto/update-address.dto';
import { CustomerResponseDto } from './primary-adapters/dto/customer-response.dto';
import { AddressResponseDto } from './primary-adapters/dto/address-response.dto';
import { ListCustomersQueryDto } from './primary-adapters/dto/list-customers-query.dto';

import { CreateCustomerUseCase } from './core/application/usecases/create-customer/create-customer.usecase';
import { GetCustomerUseCase } from './core/application/usecases/get-customer/get-customer.usecase';
import { ListCustomersUseCase } from './core/application/usecases/list-customers/list-customers.usecase';
import { UpdateCustomerUseCase } from './core/application/usecases/update-customer/update-customer.usecase';
import { DeleteCustomerUseCase } from './core/application/usecases/delete-customer/delete-customer.usecase';
import { AddAddressUseCase } from './core/application/usecases/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './core/application/usecases/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './core/application/usecases/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './core/application/usecases/set-default-address/set-default-address.usecase';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly getCustomerUseCase: GetCustomerUseCase,
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: DeleteCustomerUseCase,
    private readonly addAddressUseCase: AddAddressUseCase,
    private readonly updateAddressUseCase: UpdateAddressUseCase,
    private readonly deleteAddressUseCase: DeleteAddressUseCase,
    private readonly setDefaultAddressUseCase: SetDefaultAddressUseCase,
  ) {}

  @Post()
  @RequirePermissions('manage_customers')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return await this.createCustomerUseCase.execute(dto);
  }

  @Get()
  @RequirePermissions('view_all_customers')
  @ApiOperation({ summary: 'List all customers with pagination' })
  @ApiResponse({ status: 200, type: [CustomerResponseDto] })
  async listCustomers(@Query() query: ListCustomersQueryDto) {
    return await this.listCustomersUseCase.execute(query);
  }

  @Get(':id')
  @RequirePermissions('view_all_customers', 'view_own_profile')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async getCustomer(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.getCustomerUseCase.execute({
      customerId: id,
      callerContext,
    });
  }

  @Patch(':id')
  @RequirePermissions('manage_customers')
  @ApiOperation({ summary: 'Update customer information' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return await this.updateCustomerUseCase.execute({
      id: id,
      command: dto,
    });
  }

  @Delete(':id')
  @RequirePermissions('manage_customers')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  async deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    return await this.deleteCustomerUseCase.execute(id);
  }

  @Post(':id/addresses')
  @RequirePermissions('manage_customers', 'manage_own_addresses')
  @ApiOperation({ summary: 'Add address to customer' })
  @ApiResponse({ status: 201, type: AddressResponseDto })
  async addAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddAddressDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.addAddressUseCase.execute({
      customerId: id,
      command: dto,
      callerContext,
    });
  }

  @Patch(':id/addresses/:addressId')
  @RequirePermissions('manage_customers', 'manage_own_addresses')
  @ApiOperation({ summary: 'Update customer address' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  async updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.updateAddressUseCase.execute({
      customerId: id,
      addressId: addressId,
      command: dto,
      callerContext,
    });
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermissions('manage_customers', 'manage_own_addresses')
  @ApiOperation({ summary: 'Delete customer address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  async deleteAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.deleteAddressUseCase.execute({
      customerId: id,
      addressId: addressId,
      callerContext,
    });
  }

  @Patch(':id/addresses/:addressId/set-default')
  @RequirePermissions('manage_customers', 'manage_own_addresses')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async setDefaultAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.setDefaultAddressUseCase.execute({
      customerId: id,
      addressId: addressId,
      callerContext,
    });
  }
}
