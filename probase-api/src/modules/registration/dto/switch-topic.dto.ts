import { IsInt, Min } from 'class-validator';

export class SwitchTopicDto {
  @IsInt()
  @Min(1)
  newTopicId: number;
}
