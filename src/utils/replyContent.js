const REPLY_META_TAG = '\n\n[[MANAGER_REPLIES_V1]]';

const normalizeReply = (reply) => {
    if (!reply || typeof reply !== 'object') return null;

    const text = typeof reply.text === 'string' ? reply.text.trim() : '';
    if (!text) return null;

    return {
        id: typeof reply.id === 'string' && reply.id ? reply.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        authorName: typeof reply.authorName === 'string' && reply.authorName.trim() ? reply.authorName.trim() : '관리자',
        createdAt: typeof reply.createdAt === 'string' && reply.createdAt ? reply.createdAt : new Date().toISOString()
    };
};

export const parseContentWithReplies = (rawContent) => {
    const safeRaw = typeof rawContent === 'string' ? rawContent : '';
    const markerIndex = safeRaw.indexOf(REPLY_META_TAG);

    if (markerIndex === -1) {
        return {
            body: safeRaw,
            replies: []
        };
    }

    const body = safeRaw.slice(0, markerIndex);
    const rawJson = safeRaw.slice(markerIndex + REPLY_META_TAG.length).trim();

    if (!rawJson) {
        return { body, replies: [] };
    }

    try {
        const parsed = JSON.parse(rawJson);
        const replies = Array.isArray(parsed)
            ? parsed.map(normalizeReply).filter(Boolean)
            : [];

        return { body, replies };
    } catch {
        return {
            body: safeRaw,
            replies: []
        };
    }
};

export const buildContentWithReplies = ({ body, replies }) => {
    const normalizedBody = typeof body === 'string' ? body.trimEnd() : '';
    const normalizedReplies = Array.isArray(replies)
        ? replies.map(normalizeReply).filter(Boolean)
        : [];

    if (normalizedReplies.length === 0) {
        return normalizedBody;
    }

    return `${normalizedBody}${REPLY_META_TAG}\n${JSON.stringify(normalizedReplies)}`;
};

export const appendManagerReplyToContent = ({ content, replyText, authorName }) => {
    const { body, replies } = parseContentWithReplies(content);
    const nextReply = normalizeReply({
        text: replyText,
        authorName,
        createdAt: new Date().toISOString()
    });

    if (!nextReply) {
        return buildContentWithReplies({ body, replies });
    }

    return buildContentWithReplies({
        body,
        replies: [...replies, nextReply]
    });
};
