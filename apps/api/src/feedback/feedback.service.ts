import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedbackDto) {
    await this.prisma.feedback.create({
      data: {
        registrationRating: dto.registrationRating,
        transportRating: dto.transportRating,
        checkInRating: dto.checkInRating,
        discipleshipRating: dto.discipleshipRating,
        worshipRating: dto.worshipRating,
        preachingRating: dto.preachingRating,
        activitiesRating: dto.activitiesRating,
        musicRating: dto.musicRating,
        foodRating: dto.foodRating,
        accommodationRating: dto.accommodationRating,
        comments: dto.comments ?? '',
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
      },
    });
    return { success: true };
  }

  async findAll() {
    return this.prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
