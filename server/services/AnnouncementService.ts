import prisma from "~~/server/utils/prisma";

export class AnnouncementService {
  async getActiveAnnouncements() {
    return prisma.announcement.findMany({
      where: { enabled: true },
      orderBy: { createDate: "desc" },
    });
  }

  async adminList() {
    return prisma.announcement.findMany({
      orderBy: { createDate: "desc" },
    });
  }

  async adminCreate(data: {
    title: string;
    description: string;
    tag: string;
    tagColor?: string;
    icon?: string;
    enabled?: boolean;
    btnLabel?: string | null;
    btnLink?: string | null;
  }) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        tag: data.tag,
        tagColor: data.tagColor || "bg-violet-500/20 text-violet-300 border-violet-500/30",
        icon: data.icon || "i-heroicons-megaphone",
        enabled: data.enabled !== false,
        btnLabel: data.btnLabel || null,
        btnLink: data.btnLink || null,
      },
    });
  }

  async adminUpdate(
    id: number,
    data: {
      title?: string;
      description?: string;
      tag?: string;
      tagColor?: string;
      icon?: string;
      enabled?: boolean;
      btnLabel?: string | null;
      btnLink?: string | null;
    },
  ) {
    return prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        tag: data.tag,
        tagColor: data.tagColor,
        icon: data.icon,
        enabled: data.enabled,
        btnLabel: data.btnLabel || null,
        btnLink: data.btnLink || null,
      },
    });
  }

  async adminDelete(id: number) {
    return prisma.announcement.delete({
      where: { id },
    });
  }
}

export const announcementService = new AnnouncementService();
