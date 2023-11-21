const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, UnauthenticatedError } = require('../errors');

const register = async (req, res) => {
 
  const user = await User.create({...req.body});
  const token = user.createJWT();
  //update this and provide email, lastName, location and name 
  // token provide when /register controller call
  res.status(StatusCodes.CREATED).json({
    user:{
      email:user.email,
      lastName: user.lastName,
      location:user.location,
      name:user.name,
      token,
    },
  })

};
//login perform using email and password 
const login = async (req, res) => {
  const { email, password } = req.body;
// if email or password not provide
  if (!email || !password) {
    throw new BadRequestError('Please provide email and password');
  }
  //find entry from database using email
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError('Invalid Credentials');
  }
  const isPasswordCorrect = await user.comparePassword(password);//provide password to comparePassword function
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError('Invalid Credentials');
  }
  // create token for login session 
  const token = user.createJWT();
  //provide those value to the frontend
  res.status(StatusCodes.OK).json({
    user: {
      email: user.email,
      lastName: user.lastName,
      location: user.location,
      name: user.name,
      token,
    },
  });
};
//update any part of the profile 

const updateUser = async (req, res) => {
  const { email, name, lastName, location } = req.body;
  //if any of the values are not provided 
  if (!email || !name || !lastName || !location) {
    throw new BadRequest('Please provide all values');
  }
  //find by userId
  const user = await User.findOne({ _id: req.user.userId });
 //update the values
  user.email = email;
  user.name = name;
  user.lastName = lastName;
  user.location = location;
//save those change in database
  await user.save();
  const token = user.createJWT();
  res.status(StatusCodes.OK).json({
    user: {
      email: user.email,
      lastName: user.lastName,
      location: user.location,
      name: user.name,
      token,
    },
  });
};

module.exports = {
  register,
  login,
  updateUser,
};
