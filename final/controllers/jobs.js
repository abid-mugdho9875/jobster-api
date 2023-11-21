const Job = require('../models/Job');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, NotFoundError } = require('../errors');
const mongoose = require('mongoose');
//install for aggreagation pipeline
const moment = require('moment');
// To get all the jobs from database use this.{req.query}
const getAllJobs = async (req, res) => {
  //this are the fill up of frontend 
  const { search, status, jobType, sort } = req.query;
  //
  const queryObject = {
    createdBy: req.user.userId,
  };
  //select query object
  if(search){
    queryObject.position = {$regex: search, $options: 'i'}
  }
  //added status type with query 
  if (status && status !== 'all') {
    queryObject.status = status;
  }
    //added job type with query 

  if (jobType && jobType !== 'all') {
    queryObject.jobType = jobType;
  }
  //added result by finding queryobject from database
  let result = Job.find(queryObject);
//sorted based on those sort mode
  if (sort === 'latest') {
    result = result.sort('-createdAt');
  }
  if (sort === 'oldest') {
    result = result.sort('createdAt');
  }
  if (sort === 'a-z') {
    result = result.sort('position');
  }
  if (sort === 'z-a') {
    result = result.sort('-position');
  }
 //added pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;// added elements 50 in page
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const jobs = await result;

  const totalJobs = await Job.countDocuments(queryObject);//number of jobs
  const numOfPages = Math.ceil(totalJobs / limit);//numbers of page

  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages });//send number of jobs, numbers of page
};
//get single job based on the job id
const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req;

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  });
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }
  res.status(StatusCodes.OK).json({ job });
};


// created job post and send it to the database also seen in the frontend

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId;
  const job = await Job.create(req.body);
  res.status(StatusCodes.CREATED).json({ job });
};

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req;

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty');
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }
  res.status(StatusCodes.OK).json({ job });
};
//deleted by using id
const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req;

  const job = await Job.findByIdAndDelete({
    _id: jobId,
    createdBy: userId,
  });
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }
  res.status(StatusCodes.OK).send();
};
//mongodb aggregation pipeline
const showStats = async (req, res) => {
  let stats = await Job.aggregate([
    //filter by userID
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    //calculate the sum 
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr;
    acc[title] = count;
    return acc;
  }, {});

  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 6 },
  ]);
  console.log(monthlyApplications)

  monthlyApplications = monthlyApplications
    .map((item) => {
      const {
        _id: { year, month },
        count,
      } = item;
      const date = moment()
        .month(month - 1)
        .year(year)
        .format('MMM Y');
      return { date, count };
    })
    .reverse();

  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
};

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats,
};
