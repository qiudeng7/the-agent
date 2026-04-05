import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  BatchTasksDto,
  BatchUsersDto,
  CreateUserRecordDto,
  CreateTaskRecordDto,
} from './admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.service';
import { CryptoService } from '../auth/crypto.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly crypto: CryptoService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Database operations
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('database/:table')
  async getTableData(@Param('table') table: string) {
    const data = await this.adminService.getTableData(table);
    return { success: true, data };
  }

  @Post('database/:table')
  async createTableRecord(
    @Param('table') table: string,
    @Body() data: CreateUserRecordDto | CreateTaskRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.adminService.createTableRecord(
      table,
      data,
      user.userId,
      (p) => this.crypto.hashPassword(p),
    );
    return { success: true, data: result };
  }

  @Patch('database/:table/:id')
  async updateTableRecord(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    const parsedId = table === 'tasks' ? parseInt(id, 10) : id;
    const result = await this.adminService.updateTableRecord(
      table,
      parsedId,
      data,
    );
    return { success: true, data: result };
  }

  @Delete('database/:table/:id')
  async deleteTableRecord(
    @Param('table') table: string,
    @Param('id') id: string,
  ) {
    const parsedId = table === 'tasks' ? parseInt(id, 10) : id;
    await this.adminService.deleteTableRecord(table, parsedId);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Batch operations
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('tasks/batch')
  async createTasksBatch(
    @Body() dto: BatchTasksDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.adminService.createTasksBatch(user.userId, dto);
    return { success: true, data: result };
  }

  @Delete('tasks/batch')
  async deleteTasksBatch(@Body('ids') ids: number[]) {
    const result = await this.adminService.deleteTasksBatch(ids);
    return { success: true, data: result };
  }

  @Post('users/batch')
  async createUsersBatch(@Body() dto: BatchUsersDto) {
    const result = await this.adminService.createUsersBatch(dto, (p) =>
      this.crypto.hashPassword(p),
    );
    return { success: true, data: result };
  }

  @Delete('users/batch')
  async deleteUsersBatch(@Body('ids') ids: string[]) {
    const result = await this.adminService.deleteUsersBatch(ids);
    return { success: true, data: result };
  }
}
