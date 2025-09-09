import { Injectable } from '@nestjs/common';
import { CreateTestDto, UpdateTestDto } from '../dto/test.dto';
import { TestEntity } from '../entities/test.entity';

@Injectable()
export class TestService {
    private tests: TestEntity[] = [
        new TestEntity({
            id: '1',
            name: 'Test Item 1',
            description: 'First test item',
            value: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
        }),
        new TestEntity({
            id: '2',
            name: 'Test Item 2',
            description: 'Second test item',
            value: 200,
            createdAt: new Date(),
            updatedAt: new Date(),
        }),
    ];

    async findAll(): Promise<TestEntity[]> {
        return this.tests;
    }

    async findOne(id: string): Promise<TestEntity | null> {
        return this.tests.find(test => test.id === id) || null;
    }

    async create(createTestDto: CreateTestDto): Promise<TestEntity> {
        const newTest = new TestEntity({
            id: (this.tests.length + 1).toString(),
            ...createTestDto,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        this.tests.push(newTest);
        return newTest;
    }

    async update(id: string, updateTestDto: UpdateTestDto): Promise<TestEntity | null> {
        const testIndex = this.tests.findIndex(test => test.id === id);
        if (testIndex === -1) return null;

        this.tests[testIndex] = {
            ...this.tests[testIndex],
            ...updateTestDto,
            updatedAt: new Date(),
        };
        return this.tests[testIndex];
    }

    async remove(id: string): Promise<boolean> {
        const testIndex = this.tests.findIndex(test => test.id === id);
        if (testIndex === -1) return false;

        this.tests.splice(testIndex, 1);
        return true;
    }
}

