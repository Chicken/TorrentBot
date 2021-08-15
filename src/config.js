export default {
    token: process.env.TOKEN,
    users: process.env.USERS.split(","),
    qbit: {
        host: process.env.QBIT_HOST,
        user: process.env.QBIT_USER,
        pass: process.env.QBIT_PASS,
        insecure: process.env.QBIT_IGNORE_CERT === "true",
    },
};
