import User from '../models/User.js';

// GET /api/users/profile
const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        contactInfo: user.contactInfo,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, contactInfo, avatar } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.trim();
    if (contactInfo !== undefined) updates.contactInfo = contactInfo.trim();
    if (avatar !== undefined) updates.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        contactInfo: updatedUser.contactInfo,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export {
  getProfile,
  updateProfile,
};

