const MeetingHistory = require('../../model/schema/meeting');
const mongoose = require('mongoose');

const add = async (req, res) => {
    try {
        const { agenda, attendes, attendesLead, location, related, dateTime, notes, createdBy } = req.body;

        if (!mongoose.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({ error: 'Invalid createdBy value' });
        }

        const meetingData = { agenda, attendes, attendesLead, location, related, dateTime, notes, createdBy, timestamp: new Date() };
        const result = new MeetingHistory(meetingData);
        await result.save();

        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to create meeting:', err);
        res.status(400).json({ error: 'Failed to create meeting', err });
    }
};

const index = async (req, res) => {
    try {
        let query = req.query;
        query.deleted = false;
        if (query.createdBy) {
            query.createdBy = new mongoose.Types.ObjectId(query.createdBy);
        }

        let result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'contactAttendees'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'leadAttendees'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createdByName: '$users.username',
                }
            },
            { $project: { users: 0 } }
        ]);
        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to fetch meetings:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const view = async (req, res) => {
    try {
        let response = await MeetingHistory.findOne({ _id: req.params.id });
        if (!response) return res.status(404).json({ message: 'No Data Found' });

        let result = await MeetingHistory.aggregate([
            { $match: { _id: response._id } },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'contactAttendees'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'leadAttendees'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    createdByName: '$users.username',
                }
            },
            { $project: { users: 0 } }
        ]);

        res.status(200).json(result[0]);
    } catch (err) {
        console.error('Error:', err);
        res.status(400).json({ error: err });
    }
};

const deleteData = async (req, res) => {
    try {
        const result = await MeetingHistory.findByIdAndUpdate(req.params.id, { deleted: true });
        res.status(200).json({ message: 'Deleted successfully', result });
    } catch (err) {
        res.status(404).json({ message: 'Error', err });
    }
};

const deleteMany = async (req, res) => {
    try {
        const result = await MeetingHistory.updateMany({ _id: { $in: req.body } }, { $set: { deleted: true } });
        
        if (result?.matchedCount > 0 && result?.modifiedCount > 0) {
            return res.status(200).json({ message: 'Meetings removed successfully', result });
        } else {
            return res.status(404).json({ success: false, message: 'Failed to remove meetings' });
        }
    } catch (err) {
        return res.status(404).json({ success: false, message: 'Error', err });
    }
};

module.exports = { add, index, view, deleteData, deleteMany };
