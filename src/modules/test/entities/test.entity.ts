export class TestEntity {
    id: string;
    name: string;
    description?: string;
    value: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<TestEntity>) {
        Object.assign(this, partial);
    }
}

