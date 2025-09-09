export const databaseConfig = {
    primary: {
        url: process.env.PRIMARY_DATABASE_URL,
    },
    logs: {
        url: process.env.LOGS_DATABASE_URL,
    },
    address: {
        url: process.env.ADDRESS_DATABASE_URL,
    },
};
