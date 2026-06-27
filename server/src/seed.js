import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import User from './models/User.js';
import Community from './models/Community.js';
import City from './models/City.js';
import Concern from './models/Concern.js';
import Forum from './models/Forum.js';
import Notification from './models/Notification.js';

const PW = 'test';

async function makeUser(data) {
  const u = new User(data);
  await u.setPassword(PW);
  await u.save();
  return u;
}

async function run() {
  await connectDB(process.env.MONGO_URI);

  console.log('Dropping collections...');
  await Promise.all([
    User.deleteMany({}),
    Community.deleteMany({}),
    City.deleteMany({}),
    Concern.deleteMany({}),
    Forum.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // --- Communities & cities ---
  const riverdale = await Community.create({
    name: 'Riverdale Community',
    description: 'A riverside community focused on green infrastructure and safe streets.',
    iac: 'IAC Central',
  });
  const summit = await Community.create({
    name: 'Summit Community',
    description: 'A mountain-region community balancing growth and conservation.',
    iac: 'IAC Central',
  });

  const maplewood = await City.create({ name: 'Maplewood', description: 'Leafy suburb by the river.', community: riverdale._id });
  const brookside = await City.create({ name: 'Brookside', description: 'Historic mill town.', community: riverdale._id });
  const aspenford = await City.create({ name: 'Aspenford', description: 'Ski-town gateway.', community: summit._id });
  const pineCrest = await City.create({ name: 'Pine Crest', description: 'High-altitude residential hub.', community: summit._id });

  // --- One of each role (top of hierarchy) ---
  const topAdmin = await makeUser({ name: 'Top Level Admin', email: 'topadmin@test.com', role: 'top_admin', bio: 'Platform owner.', city: null, community: null });
  const iacBoard = await makeUser({ name: 'IAC Admin', email: 'iacadmin@test.com', role: 'iac_board', bio: 'IAC board member for IAC Central.', city: null, community: null });

  // Riverdale staff + members
  const rdAdmin = await makeUser({ name: 'Riverdale Hub Admin', email: 'hubadmin@test.com', role: 'hub_admin', bio: 'Runs the Riverdale hub.', city: maplewood._id, community: riverdale._id });
  const rdMod = await makeUser({ name: 'Riverdale Moderator', email: 'hubmod@test.com', role: 'hub_moderator', bio: 'Moderates Riverdale concerns.', city: brookside._id, community: riverdale._id });
  const rdMember = await makeUser({ name: 'Community Member', email: 'member@test.com', role: 'member', bio: 'Engaged Maplewood resident.', city: maplewood._id, community: riverdale._id });
  const rdMember2 = await makeUser({ name: 'Dana Rivers', email: 'dana@test.com', role: 'member', bio: 'Brookside parent and cyclist.', city: brookside._id, community: riverdale._id });
  const rdMember3 = await makeUser({ name: 'Omar Patel', email: 'omar@test.com', role: 'member', bio: 'Small business owner in Maplewood.', city: maplewood._id, community: riverdale._id });

  // Summit staff + members
  const smAdmin = await makeUser({ name: 'Summit Hub Admin', email: 'summitadmin@test.com', role: 'hub_admin', bio: 'Runs the Summit hub.', city: aspenford._id, community: summit._id });
  const smMod = await makeUser({ name: 'Summit Moderator', email: 'summitmod@test.com', role: 'hub_moderator', bio: 'Moderates Summit concerns.', city: pineCrest._id, community: summit._id });
  const smMember = await makeUser({ name: 'Lena Hart', email: 'lena@test.com', role: 'member', bio: 'Aspenford trail volunteer.', city: aspenford._id, community: summit._id });
  const smMember2 = await makeUser({ name: 'Carlos Munoz', email: 'carlos@test.com', role: 'member', bio: 'Pine Crest commuter.', city: pineCrest._id, community: summit._id });

  // --- Concerns (Riverdale) ---
  const c1 = await Concern.create({
    title: 'Potholes on Maple Avenue worsening', tag: 'infrastructure',
    description: '<p>The stretch of <b>Maple Avenue</b> near the school has several deep potholes. Cars are swerving into the bike lane.</p>',
    author: rdMember._id, community: riverdale._id, city: maplewood._id,
    status: 'approved', stars: [rdMember2._id, rdMember3._id, rdMod._id],
  });
  const c2 = await Concern.create({
    title: 'Streetlights out near Brookside Park', tag: 'safety',
    description: '<p>Three streetlights have been out for two weeks, making the park entrance feel unsafe at night.</p>',
    author: rdMember2._id, community: riverdale._id, city: brookside._id,
    status: 'approved', stars: [rdMember._id, rdMember3._id],
  });
  const c3 = await Concern.create({
    title: 'Request for a new community garden', tag: 'parks_rec',
    description: '<p>Could we convert the vacant lot on 4th St into a community garden?</p>',
    author: rdMember3._id, community: riverdale._id, city: maplewood._id,
    status: 'pending', stars: [rdMember._id],
  });
  const c4 = await Concern.create({
    title: 'Property tax reassessment confusion', tag: 'finance',
    description: '<p>Residents are confused about the new reassessment letters. Can we get a town hall?</p>',
    author: rdMember._id, community: riverdale._id, city: maplewood._id,
    status: 'denied',
  });

  // --- Concerns (Summit) ---
  const s1 = await Concern.create({
    title: 'Trail erosion on Aspen Ridge', tag: 'environment',
    description: '<p>Heavy rains have eroded the lower Aspen Ridge trail. Needs reinforcement before summer.</p>',
    author: smMember._id, community: summit._id, city: aspenford._id,
    status: 'approved', stars: [smMember2._id, smMod._id],
  });
  const s2 = await Concern.create({
    title: 'Affordable housing shortage for seasonal workers', tag: 'housing',
    description: '<p>Seasonal workers cannot find housing. Proposing a policy discussion.</p>',
    author: smMember2._id, community: summit._id, city: pineCrest._id,
    status: 'approved', stars: [smMember._id],
  });
  const s3 = await Concern.create({
    title: 'Speeding on Pine Crest Rd', tag: 'safety',
    description: '<p>Cars regularly speed through the residential zone. Request traffic calming.</p>',
    author: smMember2._id, community: summit._id, city: pineCrest._id,
    status: 'pending',
  });

  // --- Forums (Riverdale) ---
  const f1 = await Forum.create({
    title: 'Street Safety Initiative — Maplewood & Brookside', tag: 'safety',
    description: '<p>Consolidating road and lighting safety concerns into one action plan.</p>',
    author: rdAdmin._id, community: riverdale._id,
    linkedConcerns: [c1._id, c2._id],
    invitedUsers: [rdMember._id, rdMember2._id],
    comments: [
      { author: rdAdmin._id, body: '<p>Welcome. Let us prioritize the Maple Ave potholes first.</p>', stars: [rdMember._id] },
      { author: rdMember._id, body: '<p>Agreed — the bike lane situation is dangerous for kids.</p>', stars: [rdAdmin._id, rdMember2._id] },
      { author: rdMember2._id, body: '<p>Can we also get a timeline on the Brookside streetlights?</p>' },
      { author: rdMod._id, body: '<p>I have flagged both items with public works. Will post updates here.</p>', stars: [rdMember._id, rdMember2._id] },
      { author: iacBoard._id, body: '<p>IAC is tracking this initiative as a model for other hubs. Great work.</p>' },
    ],
  });
  await Concern.updateMany({ _id: { $in: [c1._id, c2._id] } }, { status: 'active', forum: f1._id });

  // --- Forums (Summit) ---
  const f2 = await Forum.create({
    title: 'Summer Trail & Housing Working Group', tag: 'environment',
    description: '<p>Cross-cutting forum for trail repair and seasonal housing.</p>',
    author: smMod._id, community: summit._id,
    linkedConcerns: [s1._id],
    invitedUsers: [smMember._id, smMember2._id],
    comments: [
      { author: smMod._id, body: '<p>Kicking off the working group. Volunteers welcome.</p>' },
      { author: smMember._id, body: '<p>I can organize a trail repair weekend.</p>', stars: [smMod._id] },
      { author: smAdmin._id, body: '<p>The hub can cover materials for the trail repair. Coordinate with me on budget.</p>', stars: [smMember._id] },
    ],
  });
  await Concern.updateMany({ _id: { $in: [s1._id] } }, { status: 'active', forum: f2._id });

  // A closed forum example
  const f3 = await Forum.create({
    title: 'Holiday Lighting Plan (resolved)', tag: 'parks_rec',
    description: '<p>Planning for downtown holiday lighting.</p>',
    author: rdMod._id, community: riverdale._id,
    invitedUsers: [rdMember3._id],
    comments: [
      { author: rdMember3._id, body: '<p>Lights look great this year, thanks!</p>' },
      { author: topAdmin._id, body: '<p>Nicely run from start to finish — archiving this as a reference for other hubs.</p>', stars: [rdMember3._id] },
    ],
    status: 'closed',
    resolutionSummary: '<p>Lighting installed across both downtown districts. Budget came in under estimate. Next step: schedule January takedown.</p>',
    closedAt: new Date(),
  });

  // --- Notifications ---
  // Mirrors what the notify() service produces in the app. `mins` ago controls
  // ordering/relative time; a few are left unread so the bell badge shows a count.
  const minsAgo = (m) => new Date(Date.now() - m * 60_000);
  await Notification.insertMany([
    // Carlos Munoz (smMember2) — the user shown in the header screenshot.
    { recipient: smMember2._id, actor: smMember._id, type: 'forum_comment',
      message: `${smMember.name} commented on "${f2.title}"`, forum: f2._id,
      read: false, createdAt: minsAgo(8), updatedAt: minsAgo(8) },
    { recipient: smMember2._id, actor: smMod._id, type: 'forum_new',
      message: `You were invited to the forum "${f2.title}"`, forum: f2._id,
      read: false, createdAt: minsAgo(45), updatedAt: minsAgo(45) },
    { recipient: smMember2._id, actor: smMod._id, type: 'concern_status',
      message: `Concern "${s2.title}" was marked approved`, concern: s2._id,
      read: true, readAt: minsAgo(180), createdAt: minsAgo(200), updatedAt: minsAgo(180) },
    { recipient: smMember2._id, actor: smMember._id, type: 'concern_status',
      message: `Concern "${s1.title}" was marked active`, concern: s1._id,
      read: true, readAt: minsAgo(1500), createdAt: minsAgo(1600), updatedAt: minsAgo(1500) },

    // Riverdale member (member@test.com / rdMember) — a second demo inbox.
    { recipient: rdMember._id, actor: rdMember2._id, type: 'forum_comment',
      message: `${rdMember2.name} commented on "${f1.title}"`, forum: f1._id,
      read: false, createdAt: minsAgo(20), updatedAt: minsAgo(20) },
    { recipient: rdMember._id, actor: rdMod._id, type: 'concern_status',
      message: `Concern "${c1.title}" was marked active`, concern: c1._id,
      read: true, readAt: minsAgo(600), createdAt: minsAgo(700), updatedAt: minsAgo(600) },

    // Staff: moderators get notified of newly raised (pending) concerns.
    { recipient: smMod._id, actor: smMember2._id, type: 'concern_new',
      message: `${smMember2.name} raised a concern: "${s3.title}"`, concern: s3._id,
      read: false, createdAt: minsAgo(120), updatedAt: minsAgo(120) },
    { recipient: rdMod._id, actor: rdMember3._id, type: 'concern_new',
      message: `${rdMember3.name} raised a concern: "${c3.title}"`, concern: c3._id,
      read: false, createdAt: minsAgo(300), updatedAt: minsAgo(300) },

    // Hub admins (forum authors) — activity on the forums they started.
    { recipient: rdAdmin._id, actor: rdMember2._id, type: 'forum_comment',
      message: `${rdMember2.name} commented on "${f1.title}"`, forum: f1._id,
      read: false, createdAt: minsAgo(25), updatedAt: minsAgo(25) },
    { recipient: rdAdmin._id, actor: rdMember3._id, type: 'concern_new',
      message: `${rdMember3.name} raised a concern: "${c3.title}"`, concern: c3._id,
      read: true, readAt: minsAgo(280), createdAt: minsAgo(300), updatedAt: minsAgo(280) },
    { recipient: smAdmin._id, actor: smMember2._id, type: 'concern_new',
      message: `${smMember2.name} raised a concern: "${s3.title}"`, concern: s3._id,
      read: false, createdAt: minsAgo(118), updatedAt: minsAgo(118) },

    // Other members.
    { recipient: smMember._id, actor: smMod._id, type: 'forum_new',
      message: `You were invited to the forum "${f2.title}"`, forum: f2._id,
      read: true, readAt: minsAgo(1400), createdAt: minsAgo(1500), updatedAt: minsAgo(1400) },
    { recipient: smMember._id, actor: smMember2._id, type: 'forum_comment',
      message: `${smMember2.name} commented on "${f2.title}"`, forum: f2._id,
      read: false, createdAt: minsAgo(12), updatedAt: minsAgo(12) },
    { recipient: rdMember2._id, actor: rdMember._id, type: 'forum_comment',
      message: `${rdMember.name} commented on "${f1.title}"`, forum: f1._id,
      read: false, createdAt: minsAgo(30), updatedAt: minsAgo(30) },
    { recipient: rdMember2._id, actor: rdMod._id, type: 'concern_status',
      message: `Concern "${c2.title}" was marked active`, concern: c2._id,
      read: true, readAt: minsAgo(640), createdAt: minsAgo(700), updatedAt: minsAgo(640) },
    { recipient: rdMember3._id, actor: rdMod._id, type: 'forum_closed',
      message: `The forum "${f3.title}" was closed`, forum: f3._id,
      read: false, createdAt: minsAgo(90), updatedAt: minsAgo(90) },

    // Global roles (top admin / IAC board) — they oversee all communities.
    { recipient: iacBoard._id, actor: rdMember._id, type: 'concern_new',
      message: `${rdMember.name} raised a concern: "${c3.title}"`, concern: c3._id,
      read: false, createdAt: minsAgo(150), updatedAt: minsAgo(150) },
    { recipient: topAdmin._id, actor: smMember2._id, type: 'concern_new',
      message: `${smMember2.name} raised a concern: "${s3.title}"`, concern: s3._id,
      read: false, createdAt: minsAgo(160), updatedAt: minsAgo(160) },
  ]);

  console.log('\nSeed complete!');
  console.log('Communities:', await Community.countDocuments());
  console.log('Cities:', await City.countDocuments());
  console.log('Users:', await User.countDocuments());
  console.log('Concerns:', await Concern.countDocuments());
  console.log('Forums:', await Forum.countDocuments());
  console.log('Notifications:', await Notification.countDocuments());
  console.log('\nLogin accounts (password "test"):');
  console.log('  topadmin@test.com    (Top Level Admin)');
  console.log('  iacadmin@test.com    (IAC Board)');
  console.log('  hubadmin@test.com    (Riverdale Hub Admin)');
  console.log('  hubmod@test.com      (Riverdale Moderator)');
  console.log('  member@test.com      (Riverdale Member)');
  console.log('  summitadmin@test.com (Summit Hub Admin)  + more');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
