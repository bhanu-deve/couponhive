const User   = require('../models/User');
const Coupon = require('../models/Coupon');

const AVATARS = ['🐱','🐶','🦁','🐺','🦊','🐸','🐧','🦋'];

module.exports = async function seed() {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) return; // Already seeded

    console.log('🌱  Seeding demo data...');

    // Create users
    const admin = await User.create({
      username: 'admin', email: 'admin@couponhive.com',
      password: 'admin123', role: 'admin', avatar: '👑', bio: 'Platform admin',
    });
    const user1 = await User.create({
      username: 'dealsmaster', email: 'deals@demo.com',
      password: 'demo123', role: 'user', avatar: '🦊', bio: 'Finding deals since 2020!',
    });
    const user2 = await User.create({
      username: 'savequeen', email: 'save@demo.com',
      password: 'demo123', role: 'user', avatar: '👸', bio: "I never pay full price 💅",
    });

    const now = new Date();
    const day = 86400000;

    // Create coupons
    await Coupon.create([
      {
        title: '20% Off Entire Order', code: 'SAVE20NOW',
        store: 'Amazon', category: 'Shopping', discount: '20%',
        description: 'Get 20% off your entire cart at checkout. Works on all items!',
        expiresAt: new Date(now.getTime() + day * 10),
        uploadedBy: user1._id, uploaderName: user1.username, uploaderAvatar: user1.avatar,
        likes: [user2._id], copies: 142, verified: true,
        comments: [{ user: user2._id, username: user2.username, avatar: user2.avatar, text: 'Worked for me! Saved $45 🔥' }],
      },
      {
        title: 'Free Shipping on Orders $25+', code: 'FREESHIP99',
        store: 'Walmart', category: 'Shipping', discount: 'Free Ship',
        description: 'Free standard shipping on orders over $25.',
        expiresAt: new Date(now.getTime() + day * 5),
        uploadedBy: user1._id, uploaderName: user1.username, uploaderAvatar: user1.avatar,
        likes: [user2._id, admin._id], copies: 87, verified: true,
      },
      {
        title: '15% Off All Electronics', code: 'TECH15OFF',
        store: 'Best Buy', category: 'Electronics', discount: '15%',
        description: 'Huge savings on laptops, phones, TVs and accessories!',
        expiresAt: new Date(now.getTime() + day * 2),
        uploadedBy: user2._id, uploaderName: user2.username, uploaderAvatar: user2.avatar,
        copies: 34, verified: false,
      },
      {
        title: 'Buy 1 Get 1 Free Pizza', code: 'PIZZA30',
        store: 'Dominos', category: 'Food', discount: 'BOGO',
        description: 'Order any large pizza and get a second one free. Online only.',
        expiresAt: new Date(now.getTime() + day * 1),
        uploadedBy: user2._id, uploaderName: user2.username, uploaderAvatar: user2.avatar,
        likes: [user1._id], copies: 203, verified: true,
      },
      {
        title: '$25 Off $100+ Fashion', code: 'STYLE25',
        store: 'H&M', category: 'Fashion', discount: '$25 Off',
        description: 'Spend $100 or more on clothing and save $25 instantly.',
        expiresAt: new Date(now.getTime() - day * 1), // expired
        uploadedBy: user1._id, uploaderName: user1.username, uploaderAvatar: user1.avatar,
        copies: 56, verified: false,
      },
    ]);

    console.log('✅  Demo data seeded successfully');
    
    
    
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};
