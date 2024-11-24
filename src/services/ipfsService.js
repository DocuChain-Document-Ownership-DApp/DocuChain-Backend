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
        let data = '';
        for await (const chunk of stream) {
            data += chunk.toString();
        }
        return data;
    } catch (error) {
        console.error('IPFS error:', error);
        throw error;
    }
};

export { addToIPFS, getFromIPFS };