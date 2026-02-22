import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/auth.guard';
import { CreateCustomerDto } from './presentation/dto/create-customer.dto';
import { UpdateCustomerDto } from './presentation/dto/update-customer.dto';
import { AddAddressDto } from './presentation/dto/add-address.dto';
import { UpdateAddressDto } from './presentation/dto/update-address.dto';
import { CustomerResponseDto } from './presentation/dto/customer-response.dto';
import { AddressResponseDto } from './presentation/dto/address-response.dto';
import { ListCustomersQueryDto } from './presentation/dto/list-customers-query.dto';

import { CreateCustomerUseCase } from './application/usecases/create-customer/create-customer.usecase';
import { GetCustomerUseCase } from './application/usecases/get-customer/get-customer.usecase';
import { ListCustomersUseCase } from './application/usecases/list-customers/list-customers.usecase';
import { UpdateCustomerUseCase } from './application/usecases/update-customer/update-customer.usecase';
import { DeleteCustomerUseCase } from './application/usecases/delete-customer/delete-customer.usecase';
import { AddAddressUseCase } from './application/usecases/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './application/usecases/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './application/usecases/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './application/usecases/set-default-address/set-default-address.usecase';
import { isFailure } from '../../core/domain/result';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
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
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return await this.createCustomerUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers with pagination' })
  @ApiResponse({ status: 200, type: [CustomerResponseDto] })
  async listCustomers(@Query() query: ListCustomersQueryDto) {
    return await this.listCustomersUseCase.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async getCustomer(@Param('id') id: string) {
    return await this.getCustomerUseCase.execute(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer information' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return await this.updateCustomerUseCase.execute({
      id: Number(id),
      dto,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  async deleteCustomer(@Param('id') id: string) {
    return await this.deleteCustomerUseCase.execute(Number(id));
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add address to customer' })
  @ApiResponse({ status: 201, type: AddressResponseDto })
  async addAddress(@Param('id') id: string, @Body() dto: AddAddressDto) {
    return await this.addAddressUseCase.execute({
      customerId: Number(id),
      dto,
    });
  }

  @Patch(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Update customer address' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  async updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return await this.updateAddressUseCase.execute({
      customerId: Number(id),
      addressId: Number(addressId),
      dto,
    });
  }

  @Delete(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Delete customer address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  async deleteAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return await this.deleteAddressUseCase.execute({
      customerId: Number(id),
      addressId: Number(addressId),
    });
  }

  @Patch(':id/addresses/:addressId/set-default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async setDefaultAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return await this.setDefaultAddressUseCase.execute({
      customerId: Number(id),
      addressId: Number(addressId),
    });
  }
}
