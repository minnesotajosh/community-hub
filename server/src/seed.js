import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import User from './models/User.js';
import Community from './models/Community.js';
import City from './models/City.js';
import Concern from './models/Concern.js';
import Forum from './models/Forum.js';

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
    ],
  });
  await Concern.updateMany({ _id: { $in: [s1._id] } }, { status: 'active', forum: f2._id });

  // A closed forum example
  const f3 = await Forum.create({
    title: 'Holiday Lighting Plan (resolved)', tag: 'parks_rec',
    description: '<p>Planning for downtown holiday lighting.</p>',
    author: rdMod._id, community: riverdale._id,
    invitedUsers: [rdMember3._id],
    comments: [{ author: rdMember3._id, body: '<p>Lights look great this year, thanks!</p>' }],
    status: 'closed',
    resolutionSummary: '<p>Lighting installed across both downtown districts. Budget came in under estimate. Next step: schedule January takedown.</p>',
    closedAt: new Date(),
  });

  console.log('\nSeed complete!');
  console.log('Communities:', await Community.countDocuments());
  console.log('Cities:', await City.countDocuments());
  console.log('Users:', await User.countDocuments());
  console.log('Concerns:', await Concern.countDocuments());
  console.log('Forums:', await Forum.countDocuments());
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
