import { createHash, randomBytes } from 'crypto'
import type { Logger } from 'winston'
import type { AccountUser, SessionResponse } from '@insieme/shared'
import { Conflict, Unauthorized, isUniqueViolation } from '@/lib'
import { User } from '@/user/model'
import { Session } from './session-model'
import { hashPassword, verifyPassword } from './password'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface RegisterInput {
  name: string
  document: string
  email: string
  phone: string
  password: string
}

export interface IAuthService {
  register: (input: RegisterInput) => Promise<SessionResponse>
  login: (email: string, password: string) => Promise<SessionResponse>
  logout: (token: string) => Promise<void>
  authenticate: (token: string) => Promise<User | undefined>
}

export function toAccountUser(user: User): AccountUser {
  return {
    id: user.id,
    name: user.name ?? '',
    document: user.document ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    createdAt: new Date(user.createdAt).toISOString()
  }
}

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')

export class AuthService implements IAuthService {
  // Hash used to equalize timing when the email does not exist.
  private dummyHash?: Promise<string>

  constructor(private logger: Logger) {}

  private async createSession(user: User): Promise<SessionResponse> {
    const token = randomBytes(32).toString('base64url')
    await Session.query().insert({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    })
    return { token, user: toAccountUser(user) }
  }

  public async register(input: RegisterInput): Promise<SessionResponse> {
    const exists = await User.query()
      .whereRaw('lower("email") = ?', [input.email])
      .first()
    const emailTaken = new Conflict('Correo ya registrado', {
      email: 'Ya existe una cuenta con este correo'
    })
    if (exists) throw emailTaken

    const passwordHash = await hashPassword(input.password)
    let user: User
    try {
      user = await User.query().insert({
        name: input.name,
        document: input.document,
        email: input.email,
        phone: input.phone,
        passwordHash
      })
    } catch (err) {
      if (isUniqueViolation(err)) throw emailTaken
      throw err
    }
    this.logger.info(`Account registered ${user.id}`)
    return await this.createSession(user)
  }

  public async login(
    email: string,
    password: string
  ): Promise<SessionResponse> {
    const user = await User.query()
      .whereRaw('lower("email") = ?', [email])
      .first()
    const invalid = () =>
      new Unauthorized('Correo o contraseña incorrectos', {
        password: 'Correo o contraseña incorrectos'
      })
    if (!user?.passwordHash) {
      this.dummyHash ??= hashPassword('insieme-dummy-password')
      await verifyPassword(password, await this.dummyHash)
      throw invalid()
    }
    if (!(await verifyPassword(password, user.passwordHash))) throw invalid()
    return await this.createSession(user)
  }

  public async logout(token: string): Promise<void> {
    await Session.query()
      .delete()
      .where({ tokenHash: hashToken(token) })
  }

  public async authenticate(token: string): Promise<User | undefined> {
    if (!token || token.length > 200) return undefined
    const tokenHash = hashToken(token)
    const session = await Session.query().findOne({ tokenHash })
    if (!session) return undefined
    if (session.expiresAt.getTime() <= Date.now()) {
      await Session.query().deleteById(session.id)
      return undefined
    }
    return await User.query().findById(session.userId)
  }
}
