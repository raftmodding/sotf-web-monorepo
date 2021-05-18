import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { NotyfEvent } from 'notyf';
import {
  FormResponse,
  LauncherVersion,
  LoaderVersion,
  Mod,
  ModVersion,
  RaftVersion,
  ScheduledModDeletion,
  Session,
} from '../@types';
import { ModLike } from '../@types/ModLike';
import { PasswordReset } from '../@types/PasswordReset';
import { LOCAL_STORAGE_SESSION } from '../const';
import { setSession, state } from './stateManager';
import toaster from './toaster';

class Api {
  private axios: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.axios = axios.create(config);
  }

  setAuthToken(token: string) {
    this.axios.defaults.headers.authtoken = `${token}`;
  }

  getBaseUrl() {
    return this.axios.defaults.baseURL;
  }

  async signUp(
    username: string,
    email: string,
    password: string,
    recaptcha: string,
  ): Promise<boolean> {
    try {
      await this.axios.post('/api/accountCreations', {
        username,
        email,
        password,
        recaptcha,
      });
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      if (error) {
        toaster.error(error);
      }
    }
    return false;
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const { data: session }: AxiosResponse = await this.axios.post(
        '/login/',
        {
          username,
          password,
          deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            appVersion: navigator.appVersion,
            vendor: navigator.vendor,
          },
        },
      );
      await setSession(session);
      toaster.success('Login successful');
      return true;
    } catch ({
      response: {
        data: { error },
      },
    }) {
      toaster.error(error);
    }
    return false;
  }

  async changePassword(
    currentPassword: string,
    password: string,
    passwordConfirm: string,
  ): Promise<boolean> {
    try {
      await this.axios.put(`/api/users/${state.session.user.username}`, {
        currentPassword,
        password,
        passwordConfirm,
      });
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      toaster.error(
        error ||
          `Your current password is incorrect or the new one doesn't match the criteria!`,
      );
    }
    return false;
  }

  async getMostDownloadedMods(): Promise<Mod[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        '/mods/mostDownloaded',
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get "Most Downloaded Mods"`);
    }
    return [];
  }

  async getMostLikedMods(): Promise<Mod[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get('/mods/mostLiked');
      return data;
    } catch (e) {
      toaster.error(`Failed to get "Most Liked Mods"`);
    }
    return [];
  }

  async getLauncherVersions(
    params = { sort: '-version' },
  ): Promise<LauncherVersion[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        '/api/launcherVersions',
        {
          params,
        },
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get launcher versions`);
    }
    return [];
  }

  async getLauncherVersion(version: string): Promise<LauncherVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        `/api/launcherVersions/${version}`,
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get launcher version "${version}"`);
    }
    return {} as LauncherVersion;
  }

  async addLauncherVersion(
    launcherVersion: LauncherVersion,
  ): Promise<LauncherVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.post(
        `/api/launcherVersions`,
        launcherVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async getLoaderVersions(
    params = { sort: '-rmlVersion' },
  ): Promise<LoaderVersion[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        '/api/loaderVersions',
        {
          params,
        },
      );
      return data;
    } catch (e) {
      toaster.error('Failed to get loader versions');
    }
    return [];
  }

  async getLoaderVersion(version: string): Promise<LoaderVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        `/api/loaderVersions/${version}`,
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get loader version "${version}"`);
    }
    return {} as LoaderVersion;
  }

  async addLoaderVersion(loaderVersion: LoaderVersion): Promise<LoaderVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.post(
        `/api/loaderVersions`,
        loaderVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async getSession(token: string): Promise<Session> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        `/api/sessions/${token}`,
      );
      return data;
    } catch (e) {
      toaster
        .error('Could not load session. Please login again')
        .on(NotyfEvent.Dismiss, () => {
          localStorage.removeItem(LOCAL_STORAGE_SESSION);
          state.session = null;
        });
    }
    return {} as Session;
  }

  async deleteSession(token: string): Promise<boolean> {
    try {
      await this.axios.delete(`/api/sessions/${token}`);
      this.setAuthToken(null);
      return true;
    } catch (e) {
      toaster.error('Failed to delete session');
    }
    return false;
  }

  async getModCategories(): Promise<string[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/mods/categories`);
      return data;
    } catch (e) {
      toaster.error('Failed to get mod categories');
    }
    return [];
  }

  async getMods(params = null): Promise<Mod[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/api/mods`, {
        params,
      });
      return data;
    } catch (e) {
      toaster.error('Failed to get mods');
    }
    return [];
  }

  async getMod(id: string): Promise<Mod> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/api/mods/${id}`);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async addMod(mod: Mod): Promise<Mod> {
    try {
      const { data } = await this.axios.post('/api/mods', mod);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async updateMod(mod: Mod): Promise<Mod> {
    try {
      const { data } = await this.axios.put(`/api/mods/${mod.id}`, mod);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async addModVersion(modId: number, version: ModVersion): Promise<ModVersion> {
    try {
      const { data } = await this.axios.post(
        `/api/mods/${modId}/versions`,
        version,
      );
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async updateModVersion(
    modId: number,
    version: ModVersion,
  ): Promise<ModVersion> {
    try {
      const { data } = await this.axios.put(
        `/api/mods/${modId}/versions/${version.version}`,
        version,
      );
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async getRaftVersions(
    params: any = { sort: '-releasedAt' },
  ): Promise<RaftVersion[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        `/api/raftVersions`,
        {
          params,
        },
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get raft versions`);
    }
    return [];
  }

  async getRaftVersion(id: number): Promise<RaftVersion> {
    try {
      const { data } = await this.axios.get(`/api/raftVersions/${id}`);

      return data;
    } catch (e) {
      toaster.error(`Failed to get raft version: ${id}`);
    }

    return null;
  }

  async addRaftVersion(raftVersion: RaftVersion): Promise<RaftVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.post(
        `/api/raftVersions`,
        raftVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async updateRaftVersion(raftVersion: RaftVersion): Promise<RaftVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.put(
        `/api/raftVersions/${raftVersion.id}`,
        raftVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async getForm(name: string): Promise<FormResponse> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/forms/${name}`);
      return data;
    } catch (e) {
      toaster.error(`Could not load form`);
    }
    return {} as FormResponse;
  }

  async addScheduledModDeletion(modId: number): Promise<ScheduledModDeletion> {
    try {
      const { data } = await this.axios.post(`/api/scheduledModDeletions`, {
        modId,
      });
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      if (error) {
        toaster.error(error);
      }
    }
    return null;
  }

  async addResetPassword(email: string, recaptcha: string): Promise<boolean> {
    try {
      await this.axios.post(`/api/passwordResets`, { email, recaptcha });
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;
      if (error) {
        toaster.error(error);
      }
    }
    return false;
  }

  async getPasswordReset(token: string): Promise<PasswordReset> {
    try {
      const { data } = await this.axios.get(`/api/passwordResets/${token}`);

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async setNewPassword(
    password: string,
    passwordConfirm: string,
    token: string,
  ): Promise<boolean> {
    try {
      await this.axios.delete(`/api/passwordResets/${token}`, {
        params: {
          password,
          passwordConfirm,
        },
      });

      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return false;
  }

  async deleteAccountCreation(token: string): Promise<boolean> {
    try {
      await this.axios.delete(`/api/accountCreations/${token}`);
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return false;
  }

  async getModLikes(): Promise<ModLike[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/api/modLikes`);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return [];
  }

  async likeMod(modId: string): Promise<ModLike> {
    try {
      const { data }: AxiosResponse = await this.axios.post(`/api/modLikes`, {
        modId,
      });
      state.likes.push(data.modId);

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async unlikeMod(modId: string): Promise<ModLike> {
    try {
      const { data }: AxiosResponse = await this.axios.delete(
        `/api/modLikes/${modId}`,
      );
      state.likes.splice(state.likes.indexOf(modId), 1);

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }
}

const baseURL: string =
  String(import.meta.env.VITE_API_BASE_URL) || 'http://localhost:3001';

export default new Api({
  baseURL,
});
