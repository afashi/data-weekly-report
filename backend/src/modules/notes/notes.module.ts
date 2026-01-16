import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { MeetingNoteEntity } from '../../entities/meeting-note.entity';
import { IdModule } from '../id/id.module';

/**
 * 会议待办模块
 * 提供会议待办保存功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingNoteEntity]),
    IdModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
