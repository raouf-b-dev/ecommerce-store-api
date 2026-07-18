import {
  Controller,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Delete,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from './primary-adapters/decorators/require-permissions.decorator';
import { CallerContext } from 'src/shared-kernel/domain/interfaces/caller-context.interface';
import { AddAddressUseCase } from './core/application/usecases/address/add-address/add-address.usecase';
import { DeleteAddressUseCase } from './core/application/usecases/address/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './core/application/usecases/address/set-default-address/set-default-address.usecase';
import { UpdateAddressUseCase } from './core/application/usecases/address/update-address/update-address.usecase';
import { AddAddressDto } from './primary-adapters/dto/add-address.dto';
import { AddressResponseDto } from './primary-adapters/dto/address-response.dto';
import { UpdateAddressDto } from './primary-adapters/dto/update-address.dto';
import { CallerCtx } from './primary-adapters/decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@RequirePermissions('manage_users')
export class AddressesController {
  constructor(
    private readonly addAddressUseCase: AddAddressUseCase,
    private readonly updateAddressUseCase: UpdateAddressUseCase,
    private readonly deleteAddressUseCase: DeleteAddressUseCase,
    private readonly setDefaultAddressUseCase: SetDefaultAddressUseCase,
  ) {}

  @Post(':id/addresses')
  @RequirePermissions('manage_users', 'manage_own_addresses')
  @ApiOperation({ summary: 'Add address to customer' })
  @ApiResponse({ status: 201, type: AddressResponseDto })
  async addAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddAddressDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.addAddressUseCase.execute({
      userId: id,
      command: dto,
      callerContext,
    });
  }

  @Patch(':id/addresses/:addressId')
  @RequirePermissions('manage_users', 'manage_own_addresses')
  @ApiOperation({ summary: 'Update customer address' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  async updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.updateAddressUseCase.execute({
      userId: id,
      addressId: addressId,
      command: dto,
      callerContext,
    });
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermissions('manage_users', 'manage_own_addresses')
  @ApiOperation({ summary: 'Delete customer address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  async deleteAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.deleteAddressUseCase.execute({
      userId: id,
      addressId: addressId,
      callerContext,
    });
  }

  @Patch(':id/addresses/:addressId/set-default')
  @RequirePermissions('manage_users', 'manage_own_addresses')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200 })
  async setDefaultAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.setDefaultAddressUseCase.execute({
      userId: id,
      addressId: addressId,
      callerContext,
    });
  }
}
