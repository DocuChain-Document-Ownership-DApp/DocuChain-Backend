import { create } from 'kubo-rpc-client';

const ipfs = create({
    host: process.env.IPFS_HOST,
    port: process.env.IPFS_PORT,
    protocol: process.env.IPFS_PROTOCOL,
});

const addToIPFS = async (content) => {
    try {
        const result = await ipfs.add(content);
        return result.path;
    } catch (error) {
        console.error('IPFS error:', error);
        throw error;
    }
};

const getFromIPFS = async (hash) => {
    try {
        const stream = ipfs.cat(hash);
        const chunks = []; // Store the chunks of binary data
        for await (const chunk of stream) {
            chunks.push(chunk); // Accumulate the chunks
        }
        const buffer = Buffer.concat(chunks); // Combine chunks into a single Buffer
        const data = buffer.toString('utf-8'); // Decode Buffer to a string using UTF-8
        return data;
    } catch (error) {
        console.error('IPFS error:', error);
        throw error;
    }
};

export { addToIPFS, getFromIPFS };