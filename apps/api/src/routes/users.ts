import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {db} from '../index.js';
import {auth, requireRole, type AuthedRequest} from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(auth, requireRole('REGIONAL_LEADER', 'CHURCH'));
usersRouter.use((req: AuthedRequest, res, next) => {
  if (req.user!.role === 'CHURCH' && !req.user!.churchId) return res.status(403).json({message: 'Not permitted'});
  next();
});

const roles = ['REGIONAL_LEADER', 'CHURCH', 'SECTION', 'GROUP'] as const;
const publicUser = {
  id: true, username: true, fullName: true, role: true, churchId: true, sectionId: true, groupId: true, isActive: true, createdAt: true, lastLoginAt: true,
  church: {select: {id: true, name: true}},
  section: {select: {id: true, name: true}},
  group: {select: {id: true, name: true}}
};

function cleanName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function cleanUsername(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

async function scopeFor(role: string, body: any) {
  if (!roles.includes(role as typeof roles[number])) return {error: 'Hitamo urwego rw’ukoresha.'};
  if (role === 'REGIONAL_LEADER') return {data: {role, churchId: null, sectionId: null, groupId: null}};
  if (role === 'CHURCH') {
    const churchId = Number(body.churchId);
    const church = Number.isInteger(churchId) ? await db.church.findUnique({where: {id: churchId}}) : null;
    if (!church || !church.isActive) return {error: 'Hitamo itorero rikora.'};
    return {data: {role, churchId, sectionId: null, groupId: null}};
  }
  if (role === 'SECTION') {
    const sectionId = Number(body.sectionId);
    const section = Number.isInteger(sectionId) ? await db.section.findUnique({where: {id: sectionId}}) : null;
    if (!section || !section.isActive) return {error: 'Hitamo igihande gikora.'};
    return {data: {role, churchId: section.churchId, sectionId, groupId: null}};
  }
  const groupId = Number(body.groupId);
  const group = Number.isInteger(groupId) ? await db.group.findUnique({where: {id: groupId}, include: {section: true}}) : null;
  if (!group || !group.isActive || !group.section.isActive) return {error: 'Hitamo itsinda rikora.'};
  return {data: {role, churchId: group.section.churchId, sectionId: group.sectionId, groupId}};
}

async function lastLeaderGuard(userId: number, nextRole: string, nextActive: boolean) {
  const current = await db.user.findUnique({where: {id: userId}});
  if (!current || current.role !== 'REGIONAL_LEADER' || !current.isActive) return null;
  if (nextRole === 'REGIONAL_LEADER' && nextActive) return null;
  const others = await db.user.count({where: {role: 'REGIONAL_LEADER', isActive: true, id: {not: userId}}});
  return others > 0 ? null : 'Hagarika cyangwa ukureho umuyobozi w’Intara wa nyuma ntibishoboka.';
}

async function lastChurchGuard(userId: number, nextRole: string, nextActive: boolean, nextChurchId: number | null) {
  const current = await db.user.findUnique({where: {id: userId}});
  if (!current || current.role !== 'CHURCH' || !current.isActive || current.churchId == null) return null;
  if (nextRole === 'CHURCH' && nextActive && nextChurchId === current.churchId) return null;
  const others = await db.user.count({where: {role: 'CHURCH', isActive: true, churchId: current.churchId, id: {not: userId}}});
  return others > 0 ? null : 'Hagarika cyangwa ukureho umuyobozi w’itorero wa nyuma ntibishoboka.';
}

function churchMayTouch(actor: {role: string; churchId?: number | null}, churchId: number | null | undefined, role: string) {
  if (actor.role !== 'CHURCH') return true;
  return role !== 'REGIONAL_LEADER' && churchId === actor.churchId;
}

usersRouter.get('/', async (req: AuthedRequest, res) => {
  const actor = req.user!;
  const where = actor.role === 'CHURCH' ? {churchId: actor.churchId!} : {};
  res.json(await db.user.findMany({where, select: publicUser, orderBy: [{role: 'asc'}, {fullName: 'asc'}]}));
});

usersRouter.post('/', async (req: AuthedRequest, res) => {
  const username = cleanUsername(req.body.username);
  const fullName = cleanName(req.body.fullName);
  const password = String(req.body.password || '');
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return res.status(400).json({message: 'Username igomba kuba inyuguti 3 kugeza 40, nta space.'});
  if (fullName.length < 2) return res.status(400).json({message: 'Amazina y’ukoresha arakenewe.'});
  if (password.length < 8) return res.status(400).json({message: 'Ijambobanga rigomba kuba nibura inyuguti 8.'});
  const scope = await scopeFor(String(req.body.role || ''), req.body);
  if (scope.error || !scope.data) return res.status(400).json({message: scope.error});
  if (!churchMayTouch(req.user!, scope.data.churchId, scope.data.role)) return res.status(403).json({message: 'Ushobora gukora konti z’itorero ryawe gusa.'});
  const taken = await db.user.findUnique({where: {username}});
  if (taken) return res.status(400).json({message: 'Iyi username isanzwe ikoreshwa.'});
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.user.create({data: {username, fullName, passwordHash, ...scope.data}, select: publicUser});
  res.status(201).json(created);
});

usersRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = Number.isInteger(id) ? await db.user.findUnique({where: {id}}) : null;
  if (!existing || !churchMayTouch(req.user!, existing.churchId, existing.role)) return res.status(404).json({message: 'Ukoresha ntabonetse.'});
  const fullName = req.body.fullName == null ? existing.fullName : cleanName(req.body.fullName);
  const username = req.body.username == null ? existing.username : cleanUsername(req.body.username);
  const role = req.body.role == null ? existing.role : String(req.body.role);
  const isActive = req.body.isActive == null ? existing.isActive : Boolean(req.body.isActive);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return res.status(400).json({message: 'Username igomba kuba inyuguti 3 kugeza 40, nta space.'});
  if (fullName.length < 2) return res.status(400).json({message: 'Amazina y’ukoresha arakenewe.'});
  if (req.user!.id === id && !isActive) return res.status(400).json({message: 'Ntushobora kwihagarika.'});
  if (req.user!.role === 'CHURCH' && req.user!.id === id && role !== existing.role) return res.status(400).json({message: 'Ntushobora kwihindura urwego.'});
  const guard = await lastLeaderGuard(id, role, isActive);
  if (guard) return res.status(400).json({message: guard});
  const scopeBody = {
    churchId: req.body.churchId ?? existing.churchId,
    sectionId: req.body.sectionId ?? existing.sectionId,
    groupId: req.body.groupId ?? existing.groupId
  };
  const scope = await scopeFor(role, scopeBody);
  if (scope.error || !scope.data) return res.status(400).json({message: scope.error});
  if (!churchMayTouch(req.user!, scope.data.churchId, scope.data.role)) return res.status(403).json({message: 'Ushobora gukora konti z’itorero ryawe gusa.'});
  const churchGuard = await lastChurchGuard(id, scope.data.role, isActive, scope.data.churchId);
  if (churchGuard) return res.status(400).json({message: churchGuard});
  const taken = await db.user.findFirst({where: {username, id: {not: id}}});
  if (taken) return res.status(400).json({message: 'Iyi username isanzwe ikoreshwa.'});
  const password = String(req.body.password || '');
  if (req.body.password != null && password.length > 0 && password.length < 8) return res.status(400).json({message: 'Ijambobanga rigomba kuba nibura inyuguti 8.'});
  const passwordHash = password.length >= 8 ? await bcrypt.hash(password, 10) : undefined;
  const updated = await db.user.update({
    where: {id},
    data: {username, fullName, isActive, ...scope.data, ...(passwordHash ? {passwordHash} : {})},
    select: publicUser
  });
  res.json(updated);
});
