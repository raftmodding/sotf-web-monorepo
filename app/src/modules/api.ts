import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { NotyfEvent } from 'notyf';
import { ErrorDto } from '../../../shared/dto/ErrorDto';
import { LoaderVersionDto } from '../../../shared/dto/LoaderVersionDto';
import { ModDto } from '../../../shared/dto/ModDto';
import { ModVersionDto } from '../../../shared/dto/ModVersionDto';
import { QueryParams } from '../../../shared/types/QueryParams';
import { setSession } from '../store/actions/session.actions';
import { unPersistSession } from '../store/persistence.store';
import { state } from '../store/store';
import {
  FormResponse,
  LauncherVersion,
  LoaderVersion,
  Mod,
  ModVersion,
  RaftVersion,
  Session,
} from '../types';
import { ModLike } from '../types/ModLike';
import { toaster } from './toaster';

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
      await this.axios.post('/accountCreations', {
        username,
        email,
        password,
        recaptcha,
      });
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      if (error) {
        toaster.error(error);
      }
    }
    return false;
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const { data: session }: AxiosResponse = await this.axios.post(
        '/users/login',
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
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      toaster.error(error);
    }
    return false;
  }

  async discordAuth(code: string): Promise<boolean> {
    try {
      const { data: session }: AxiosResponse = await this.axios.post(
        `/auth/discord`,
        {
          code,
        },
      );
      await setSession(session);
      return true;
    } catch (e) {
      return false;
    }
  }

  async finishAccount(
    username: string,
    email: string,
  ): Promise<boolean | string> {
    try {
      const { data: session }: AxiosResponse = await this.axios.post(
        `/account/finish`,
        {
          username,
          email,
        },
      );
      setSession(session);
      return true;
    } catch ({ response }) {
      const { data } = response as AxiosResponse<ErrorDto>;
      return data?.error ? data.error : false;
    }
  }

  async changePassword(
    currentPassword: string,
    password: string,
    passwordConfirm: string,
  ): Promise<boolean> {
    try {
      await this.axios.put(`/users`, {
        currentPassword,
        password,
        passwordConfirm,
      });
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
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

  async getMostLikedMods() {
    try {
      const { data }: AxiosResponse = await this.axios.get('/mods/mostLiked');
      return data;
    } catch (e) {
      toaster.error(`Failed to get "Most Liked Mods"`);
    }
    return [];
  }

  async getLauncherVersions(params: QueryParams = { sort: '-createdAt' }) {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        '/launcherVersions',
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
        `/launcherVersions/${version}`,
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get launcher version "${version}"`);
    }
    return {} as LauncherVersion;
  }

  async addLauncherVersion(launcherVersion: LauncherVersion) {
    try {
      const { data }: AxiosResponse = await this.axios.post(
        `/launcherVersions`,
        launcherVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async getLoaderVersions(
    params = { sort: '-createdAt' },
  ): Promise<LoaderVersion[] | LoaderVersionDto[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get('/loaderVersions', {
        params,
      });
      return data;
    } catch (e) {
      toaster.error('Failed to get loader versions');
    }
    return [];
  }

  async getLoaderVersion(version: string): Promise<LoaderVersion> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        `/loaderVersions/${version}`,
      );
      return data;
    } catch (e) {
      toaster.error(`Failed to get loader version "${version}"`);
    }
    return {} as LoaderVersion;
  }

  async addLoaderVersion(loaderVersion: LoaderVersion) {
    try {
      const { data }: AxiosResponse = await this.axios.post(
        `/loaderVersions`,
        loaderVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async getSession(token: string): Promise<Session> {
    try {
      const { data }: AxiosResponse = await this.axios.get(
        `/sessions/${token}`,
      );
      return data;
    } catch (e) {
      toaster
        .error('Could not load session. Please login again')
        .on(NotyfEvent.Dismiss, () => {
          unPersistSession();
          state.session = null;
        });
    }
    return {} as Session;
  }

  async deleteSession(token: string): Promise<boolean> {
    try {
      await this.axios.delete(`/sessions/${token}`);
      this.setAuthToken('');
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

  async getMods(params?: QueryParams): Promise<ModDto[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/mods`, {
        params,
      });
      return data;
    } catch (e) {
      toaster.error('Failed to get mods');
    }
    return [];
  }

  async getMod(id: string) {
    try {
      const { data }: AxiosResponse = await this.axios.get<ModDto>(
        `/mods/${id}`,
      );
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async addMod(mod: ModDto) {
    try {
      const { data } = await this.axios.post<ModDto>('/mods', mod);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async updateMod(mod: ModDto) {
    try {
      const { data } = await this.axios.put(`/mods/${mod.id}`, mod);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async getModVersion(id: number) {
    try {
      const { data } = await this.axios.get<ModVersionDto>(
        `/modVersions/${id}`,
      );
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
  }

  async addModVersion(modId: number, version: ModVersion) {
    try {
      const { data } = await this.axios.post(`/modVersions`, {
        ...version,
        modId,
      });
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      toaster.error(
        error || '<b>Form invalid!</b><br/> Please check your inputs',
      );
    }
    return null;
  }

  async updateModVersion(id: number, version: ModVersionDto) {
    try {
      const body: ModVersionDto = { ...version };
      delete body.mod;
      const { data } = await this.axios.put<ModVersionDto>(
        `/modVersions/${id}`,
        body,
      );
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
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
      const { data }: AxiosResponse = await this.axios.get(`/raftVersions`, {
        params,
      });
      return data;
    } catch (e) {
      toaster.error(`Failed to get raft versions`);
    }
    return [];
  }

  async getRaftVersion(id: number) {
    try {
      const { data } = await this.axios.get(`/raftVersions/${id}`);

      return data;
    } catch (e) {
      toaster.error(`Failed to get raft version: ${id}`);
    }

    return null;
  }

  async addRaftVersion(raftVersion: RaftVersion) {
    try {
      const { data }: AxiosResponse = await this.axios.post(
        `/raftVersions`,
        raftVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async updateRaftVersion(raftVersion: RaftVersion) {
    try {
      const { data }: AxiosResponse = await this.axios.put(
        `/raftVersions/${raftVersion.id}`,
        raftVersion,
      );

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async getForm(name: string) {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/forms/${name}`);
      return data;
    } catch (e) {
      toaster.error(`Could not load form`);
    }
    return {} as FormResponse;
  }

  async addScheduledModDeletion(modId: number){
    try {
      const { data } = await this.axios.post(`/scheduledModDeletions`, {
        modId,
      });
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      if (error) {
        toaster.error(error);
      }
    }
    return null;
  }

  async addResetPassword(email: string, recaptcha: string) {
    try {
      await this.axios.post(`/passwordResets`, { email, recaptcha });
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;
      if (error) {
        toaster.error(error);
      }
    }
    return false;
  }

  async getPasswordReset(token: string) {
    try {
      const { data } = await this.axios.get(`/passwordResets/${token}`);

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

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
      await this.axios.delete(`/passwordResets/${token}`, {
        params: {
          password,
          passwordConfirm,
        },
      });

      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return false;
  }

  async deleteAccountCreation(token: string): Promise<boolean> {
    try {
      await this.axios.delete(`/accountCreations/${token}`);
      return true;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return false;
  }

  async getModLikes(): Promise<ModLike[]> {
    try {
      const { data }: AxiosResponse = await this.axios.get(`/modLikes`);
      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return [];
  }

  async likeMod(modId: string) {
    try {
      const { data }: AxiosResponse = await this.axios.post(`/modLikes`, {
        modId,
      });
      state.likes.push(data.modId);

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }

  async unlikeMod(modId: string) {
    try {
      const { data }: AxiosResponse = await this.axios.delete(
        `/modLikes/${modId}`,
      );
      state.likes.splice(state.likes.indexOf(modId), 1);

      return data;
    } catch ({ response }) {
      const {
        data: { error },
      } = response as AxiosResponse<ErrorDto>;

      if (error) {
        toaster.error(error);
      }
    }

    return null;
  }
}

const baseURL: string =
  String(import.meta.env.VITE_API_BASE_URL) || 'http://localhost:3001';

export const api = new Api({
  baseURL,
});
