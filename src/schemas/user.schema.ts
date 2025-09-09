export class UserSchema {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

export class CreateUserSchema {
    email: string;
    name: string;
    password: string;
    role?: string;
}

export class UpdateUserSchema {
    email?: string;
    name?: string;
    role?: string;
}

