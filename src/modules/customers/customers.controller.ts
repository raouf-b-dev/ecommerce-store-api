import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { CreateCustomerDto } from './presentation/dto/create-customer.dto';
import { UpdateCustomerDto } from './presentation/dto/update-customer.dto';
import { AddAddressDto } from './presentation/dto/add-address.dto';
import { UpdateAddressDto } from './presentation/dto/update-address.dto';
import { CustomerResponseDto } from './presentation/dto/customer-response.dto';
import { AddressResponseDto } from './presentation/dto/address-response.dto';
import { ListCustomersQueryDto } from './presentation/dto/list-customers-query.dto';
import { CreateCustomerController } from './presentation/controllers/create-customer/create-customer.controller';
import { GetCustomerController } from './presentation/controllers/get-customer/get-customer.controller';
import { ListCustomersController } from './presentation/controllers/list-customers/list-customers.controller';
import { UpdateCustomerController } from './presentation/controllers/update-customer/update-customer.controller';
import { DeleteCustomerController } from './presentation/controllers/delete-customer/delete-customer.controller';
import { AddAddressController } from './presentation/controllers/add-address/add-address.controller';
import { UpdateAddressController } from './presentation/controllers/update-address/update-address.controller';
import { DeleteAddressController } from './presentation/controllers/delete-address/delete-address.controller';
import { SetDefaultAddressController } from './presentation/controllers/set-default-address/set-default-address.controller';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomerController: CreateCustomerController,
    private readonly getCustomerController: GetCustomerController,
    private readonly listCustomersController: ListCustomersController,
    private readonly updateCustomerController: UpdateCustomerController,
    private readonly deleteCustomerController: DeleteCustomerController,
    private readonly addAddressController: AddAddressController,
    private readonly updateAddressController: UpdateAddressController,
    private readonly deleteAddressController: DeleteAddressController,
    private readonly setDefaultAddressController: SetDefaultAddressController,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.createCustomerController.handle(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers with pagination' })
  @ApiResponse({ status: 200, type: [CustomerResponseDto] })
  async listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.listCustomersController.handle(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async getCustomer(@Param('id') id: string) {
    return this.getCustomerController.handle(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer information' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.updateCustomerController.handle(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  async deleteCustomer(@Param('id') id: string) {
    return this.deleteCustomerController.handle(id);
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add address to customer' })
  @ApiResponse({ status: 201, type: AddressResponseDto })
  async addAddress(@Param('id') id: string, @Body() dto: AddAddressDto) {
    return this.addAddressController.handle(id, dto);
  }

  @Patch(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Update customer address' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  async updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.updateAddressController.handle(id, addressId, dto);
  }

  @Delete(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Delete customer address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  async deleteAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.deleteAddressController.handle(id, addressId);
  }

  @Patch(':id/addresses/:addressId/set-default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async setDefaultAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.setDefaultAddressController.handle(id, addressId);
  }
}
