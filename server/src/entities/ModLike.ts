import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { AbstractEntityWithCreatedAndUpdated } from './AbstractEntity';
import { Mod } from './Mod';
import { User } from './User';

@Entity({ name: 'modlikes' }) //No uppercase! https://github.com/typeorm/typeorm/issues/4420
export class ModLike extends AbstractEntityWithCreatedAndUpdated {
  @PrimaryColumn({ unique: true })
  userId!: number;

  @Column({ length: 64 })
  modId!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user?: User;

  @OneToOne(() => Mod)
  @JoinColumn()
  mod?: Mod;
}
