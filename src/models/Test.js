import mongoose from 'mongoose';
const Character = mongoose.model('Character', new mongoose.Schema({
    name: String,
    age: Number
}));

const _id = new mongoose.Types.ObjectId('0'.repeat(24));
let doc = await Character.create({ _id, name: 'Jean-Luc Picard' });
doc; // { name: 'Jean-Luc Picard', _id: ObjectId('000000000000000000000000') }

const filter = { name: 'Jean-Luc Picard' };
const update = { age: 59 };

// The result of `findOneAndUpdate()` is the document _before_ `update` was applied
doc = await Character.findOneAndUpdate(filter, update);
doc; // { name: 'Jean-Luc Picard', _id: ObjectId('000000000000000000000000') }

doc = await Character.findOne(filter);
doc.age; // 59