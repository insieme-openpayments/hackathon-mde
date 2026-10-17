import { User, type OneClickGrant } from './model'

type GetKeys = keyof Pick<User, 'id' | 'walletAddress'>

export interface IUserService {
  create: (walletAddress: string) => Promise<User>
  get: (key: GetKeys, value: string) => Promise<User | undefined>
  setGrant: (userId: string, grant: OneClickGrant) => Promise<void>
  /** Replaces the stored grant only if it still holds `previousAccessToken`. */
  rotateGrant: (
    userId: string,
    previousAccessToken: string,
    grant: OneClickGrant
  ) => Promise<boolean>
  clearGrant: (userId: string) => Promise<void>
  /** Clears the grant only if it still holds `accessToken`. */
  clearGrantIfToken: (userId: string, accessToken: string) => Promise<void>
}

export class UserService implements IUserService {
  public async create(walletAddress: string): Promise<User> {
    return await User.query().insert({
      walletAddress
    })
  }

  public async get(key: GetKeys, value: string): Promise<User | undefined> {
    return await User.query().findOne(key, '=', value)
  }

  public async setGrant(userId: string, grant: OneClickGrant): Promise<void> {
    await User.query().patch({ oneClickGrant: grant }).where({ id: userId })
  }

  public async rotateGrant(
    userId: string,
    previousAccessToken: string,
    grant: OneClickGrant
  ): Promise<boolean> {
    const n = await User.query()
      .patch({ oneClickGrant: grant })
      .where({ id: userId })
      .whereRaw(`"oneClickGrant"->>'accessToken' = ?`, [previousAccessToken])
    return n > 0
  }

  public async clearGrant(userId: string): Promise<void> {
    await User.query().patch({ oneClickGrant: null }).where({ id: userId })
  }

  public async clearGrantIfToken(
    userId: string,
    accessToken: string
  ): Promise<void> {
    await User.query()
      .patch({ oneClickGrant: null })
      .where({ id: userId })
      .whereRaw(`"oneClickGrant"->>'accessToken' = ?`, [accessToken])
  }
}
