import { ActionContext, Module, MutationTree, ActionTree, GetterTree } from 'vuex'
import { make } from 'vuex-pathify'
import { IUser } from './UserModel'

interface IUserState {
  name: string
  items: IUser[],
  defaultUser: IUser
}

export interface IUserGetters {
  defaultGetter(state: IUserState): boolean
}

export interface IUserMutations {
  defaultMutation(state: IUserState, payload: IUser): void
}

export interface IUserActions {
  defaultAction(context: ActionContext<IUserState, any>, payload: IUser): Promise<any>
}

const state: IUserState = {
  name: 'user',
  items: [],
  defaultUser: {}
}

const mutations: MutationTree<IUserState> = {
  ...make.mutations(state)
}

const actions: ActionTree<IUserState, any> = {
  ...make.actions(state)
}

const getters: GetterTree<IUserState, any > = {
  ...make.getters(state)
}

const UserModule: Module<IUserState, any> = {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
export default UserModule
