import { Body, Controller, Delete, Path, Post, Route, Security } from 'tsoa';
import { AccountCreationDto } from '../../../shared/dto/AccountCreationDto';
import { AccountCreationService } from '../services/AccountCreationService';

@Route('/accountCreations')
export class AccountCreationController extends Controller {
  @Post()
  @Security('captcha')
  public async create(@Body() data: AccountCreationDto) {
    const { username, email } = data;

    if (await AccountCreationService.alreadyExists(username!, email!)) {
      this.setStatus(400);
      return { error: 'Username or E-Mail is already taken!' };
    }

    //TODO: validate body - lol

    AccountCreationService.create(data);
    this.setStatus(204);
  }

  @Delete('/{token}')
  public async delete(@Path() token: string) {
    const accountCreation = await AccountCreationService.getByToken(token);

    if (!accountCreation) {
      this.setStatus(403);
      return { error: 'Invalid token!' };
    }

    const user = AccountCreationService.finishRegistration(
      accountCreation,
      token,
    );

    this.setStatus(204);
    return user;
  }
}
