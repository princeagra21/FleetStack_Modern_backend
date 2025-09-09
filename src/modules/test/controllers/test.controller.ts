import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TestService } from '../services/test.service';
import { CreateTestDto, UpdateTestDto, TestResponseDto } from '../dto/test.dto';

@ApiTags('test')
@Controller('test')
export class TestController {
    constructor(private readonly testService: TestService) { }

    @Get()
    @ApiOperation({ summary: 'Get all test items' })
    @ApiResponse({
        status: 200,
        description: 'Test items retrieved successfully',
        type: [TestResponseDto]
    })
    async findAll(): Promise<TestResponseDto[]> {
        return this.testService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get test item by ID' })
    @ApiParam({ name: 'id', description: 'Test item ID' })
    @ApiResponse({
        status: 200,
        description: 'Test item retrieved successfully',
        type: TestResponseDto
    })
    @ApiResponse({ status: 404, description: 'Test item not found' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TestResponseDto | null> {
        return this.testService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create new test item' })
    @ApiResponse({
        status: 201,
        description: 'Test item created successfully',
        type: TestResponseDto
    })
    async create(@Body() createTestDto: CreateTestDto): Promise<TestResponseDto> {
        return this.testService.create(createTestDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update test item by ID' })
    @ApiParam({ name: 'id', description: 'Test item ID' })
    @ApiResponse({
        status: 200,
        description: 'Test item updated successfully',
        type: TestResponseDto
    })
    @ApiResponse({ status: 404, description: 'Test item not found' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateTestDto: UpdateTestDto,
    ): Promise<TestResponseDto | null> {
        return this.testService.update(id, updateTestDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete test item by ID' })
    @ApiParam({ name: 'id', description: 'Test item ID' })
    @ApiResponse({
        status: 200,
        description: 'Test item deleted successfully',
        schema: { type: 'object', properties: { success: { type: 'boolean' } } }
    })
    @ApiResponse({ status: 404, description: 'Test item not found' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
        const result = await this.testService.remove(id);
        return { success: result };
    }
}