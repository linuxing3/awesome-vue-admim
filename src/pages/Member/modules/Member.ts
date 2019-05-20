import { ActionContext, Module, MutationTree, ActionTree, GetterTree } from 'vuex'
import { make } from 'vuex-pathify'
import bcrypt from 'bcryptjs'
import lfService from '@/util/request.localforage'
import { defaultMember } from '@/api/constant'

export interface IMemberState {
  name: string
  items: any[]
  cached: any[]
  defaultMember: any
  token: any
  loggedIn: boolean
  filter: {
    search: string
    sort: string
  }
  entity?: string
  $entity?: string
  data?: any[]
}
export interface IMemberGetters {
  // [name: string]: (state: IMemberState) => any
  isAuthenticated(state: IMemberState): boolean
}

export interface IMemberMutations {
  // [name: string]: (state: IMemberState, payload: any) => any
  CACHE_ITEMS(state: IMemberState, newMember): void
  SET_ACCESS_TOKEN(state: IMemberState, accessToken: string): void
  SET_REFRESH_TOKEN(state: IMemberState, refreshToken: string): void
}

export interface IMemberActions {
  init(context: ActionContext<IMemberState, any>, data): Promise<any>
  signup(context: ActionContext<IMemberState, any>, data): Promise<any>
  setLoginStatus(context: ActionContext<IMemberState, any>, data): Promise<any>
  getMemberInfo(context: ActionContext<IMemberState, any>, data): Promise<any>
  clearCache(context: ActionContext<IMemberState, any>, data?: any): Promise<any>
  createToken?(context: ActionContext<IMemberState, any>, data: IAuthRequest): Promise<any>
  refreshToken?(context: ActionContext<IMemberState, any>): Promise<any>
  revokeToken?(context: ActionContext<IMemberState, any>): Promise<any>
}

export interface IAuthResponse {
  accessToken: string
  refreshToken: string
}

export interface IAuthRequest {
  username: string
  password: string
}

const state: IMemberState = {
  name: 'member',
  items: [],
  cached: [],
  defaultMember,
  token: '',
  loggedIn: false,
  filter: {
    search: '',
    sort: ''
  }
}

const mutations: MutationTree<IMemberState> = {
  ...make.mutations(state),
  CACHE_ITEMS(state, newMember) {
    state.cached.push(newMember)
  }
}

const MemberActions: IMemberActions = {
  // 创建初始化用户
  async init(ctx) {
    console.log('创建默认账户')
    const defaultMember = { ...ctx.state.defaultMember }
    const hash = await bcrypt.hash(defaultMember.password, 10)
    defaultMember.hash = hash
    await lfService.request({
      url: '/member',
      method: 'post',
      data: defaultMember
    })
  },
  // 注册用户
  async signup(ctx, loginParams) {
    // 按姓名查找账户
    console.log('Signup')
    const {
      result: { model }
    } = await lfService.request({
      url: '/member',
      method: 'get',
      pagination: {
        pageNo: 1,
        pageSize: 100
      }
    })

    const authedMember = model
      .query()
      .where('username', loginParams.username)
      .get()

    console.log(authedMember)

    if (authedMember === undefined) {
      try {
        console.log('该用户不存在，正在创建!')

        // 1 加密密码
        let memberInfo = {
          ...loginParams,
          role: 'admin'
        }

        // 2 保存用户名和加密密码
        await lfService.request({
          url: '/member',
          method: 'post',
          data: memberInfo
        })
        console.log('保存用户名和加密密码')

        // 3 使用创建后账户，再次尝试登录
        await ctx.dispatch('signup', memberInfo)
      } catch (e) {
        throw new Error('添加新账户失败!')
      }
    } else {
      console.log('账户已注册，请登录')
      // 检查用户名和密码
      let hash = authedMember[0].hash
      let password = loginParams.password
      let valid = await bcrypt.compare(password, hash)
      if (valid) {
        console.log('密码验证通过')
        await ctx.dispatch('setLoginStatus')
      } else {
        console.log('无效密码')
        ctx.commit('SET_LOGGED_IN', false)
      }
    }
  },
  // 设置登录状态
  async setLoginStatus(ctx) {
    // 登录状态为真
    ctx.commit('SET_LOGGED_IN', true)
    // 设置简单托证
    ctx.commit('SET_TOKEN', 'qqyzkzldrx')
  },
  async getMemberInfo(ctx, authData) {
    const {
      result: { data }
    } = await lfService.request({
      url: '/member',
      method: 'get',
      data: authData.id,
      pagination: {
        pageNo: 1,
        pageSize: 100
      }
    })
    return data
  },
  // Logs out the current user.
  async clearCache({ commit }) {
    // 登录状态为假
    commit('SET_LOGGED_IN', false)
  }
}

const actions: ActionTree<IMemberState, any> = {
  ...make.actions(state),
  ...MemberActions
}

const getters: GetterTree<IMemberState, any> = {
  ...make.getters(state)
}

const MemberModule: Module<IMemberState, any> = {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}

export default MemberModule
