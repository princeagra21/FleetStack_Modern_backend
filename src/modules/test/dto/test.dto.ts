import { ApiProperty } from '@nestjs/swagger';

export class CreateTestDto {
    @ApiProperty({ description: 'Test item name', example: 'Test Item 1' })
    name: string;

    @ApiProperty({ description: 'Test item description', example: 'First test item', required: false })
    description?: string;

    @ApiProperty({ description: 'Test item value', example: 100 })
    value: number;
}

export class UpdateTestDto {
    @ApiProperty({ description: 'Test item name', example: 'Updated Test Item', required: false })
    name?: string;

    @ApiProperty({ description: 'Test item description', example: 'Updated description', required: false })
    description?: string;

    @ApiProperty({ description: 'Test item value', example: 200, required: false })
    value?: number;
}

export class TestResponseDto {
    @ApiProperty({ description: 'Test item ID', example: '1' })
    id: string;

    @ApiProperty({ description: 'Test item name', example: 'Test Item 1' })
    name: string;

    @ApiProperty({ description: 'Test item description', example: 'First test item' })
    description?: string;

    @ApiProperty({ description: 'Test item value', example: 100 })
    value: number;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt: Date;
}