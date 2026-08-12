import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { AccountProfile } from "./types";

export interface CommunityPost {
  id: string;
  source: string;
  authorUid: string;
  authorName: string;
  username: string;
  authorImage: string;
  authorRole: string;
  content: string;
  imageUrl: string;
  imagePath: string;
  hashtags: string[];
  mentions: string[];
  createdAt: number;
  reactions: Record<string, string>;
  likes: string[];
  commentCount: number;
  shareCount: number;
  latestComment: { userName: string; content: string; createdAt: number } | null;
}

export interface CommunityComment {
  id: string; userId: string; userName: string; userImage: string; content: string; createdAt: number;
}

export interface CommunityReply extends CommunityComment { parentReplyId: string; userReplyingTo: string; }
export interface CommunityMemberProfile { uid: string; role: string; name: string; username: string; imageUrl: string; bio: string; category: string; organisation: string; level: string; state: string; address: string; skills: string[]; website: string; linkedinUrl: string; githubUrl: string; portfolioUrl: string; verified: boolean; }

const tweetSource = "tweets";
const millis = (value: unknown) => value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : value && typeof value === "object" && "seconds" in value ? Number(value.seconds) * 1000 : new Date(String(value || "")).getTime() || 0;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const communityName = (profile: Record<string, unknown>, fallback: unknown = "IT Connect member") => String(profile.fullName || profile.name || profile.displayName || profile.companyName || fallback || "IT Connect member");
const communityImage = (profile: Record<string, unknown>, fallback: unknown = "") => String(profile.imageUrl || profile.logoURL || profile.avatarUrl || profile.profileImage || profile.photoURL || fallback || "");

export async function listCommunityPosts(): Promise<CommunityPost[]> {
  const snapshot = await getDocs(query(collection(db, tweetSource), orderBy("timestamp", "desc"), limit(100)));
  const userCache = new Map<string, Record<string, unknown>>();
  const posts = await Promise.all(snapshot.docs.map(async entry => {
    const data = entry.data(); const author = data.author && typeof data.author === "object" ? data.author : {};
    const authorUid = String(data.userId || data.authorUid || data.uid || author.uid || author.id || "");
    if (authorUid && !userCache.has(authorUid)) userCache.set(authorUid, await getCommunityUser(authorUid));
    const profile = userCache.get(authorUid) || {};
    const content = String(data.content || data.text || data.body || "");
    const authorName = communityName(profile, data.authorName || data.userName || author.name || author.fullName);
    const authorRole = String(profile.role || data.authorRole || data.role || author.role || "member");
    const resolvedImage = communityImage(profile, data.authorImage || data.profileImage || author.imageUrl);
    const authorImage = resolvedImage || (authorRole.toLowerCase().includes("admin") || authorName.trim().toLowerCase() === "it connect" ? "/app/images/appstore.png" : "");
    const commentsRef = collection(db, tweetSource, entry.id, "comments");
    let commentCount = Number(data.commentCount || data.commentsCount || 0);
    let latestComment: CommunityPost["latestComment"] = null;
    try {
      const [countSnapshot, latestSnapshot] = await Promise.all([getCountFromServer(commentsRef), getDocs(query(commentsRef, orderBy("timestamp", "desc"), limit(1)))]);
      commentCount = countSnapshot.data().count;
      const latest = latestSnapshot.docs[0]?.data();
      if (latest) latestComment = { userName: String(latest.user || latest.userName || latest.studentName || "IT Connect member"), content: String(latest.content || ""), createdAt: millis(latest.timestamp || latest.createdAt) };
    } catch { /* Keep denormalized counters when legacy comment reads are unavailable. */ }
    return {
      id: entry.id, source: tweetSource, authorUid,
      authorName,
      username: String(profile.username || data.username || author.username || ""), authorImage,
      authorRole, content,
      imageUrl: String(data.imageUrl || data.photoUrl || data.mediaUrl || ""), imagePath: String(data.imagePath || data.storagePath || ""),
      hashtags: strings(data.hashtags).length ? strings(data.hashtags) : [...content.matchAll(/#([\w-]+)/g)].map(match => match[1].toLowerCase()),
      mentions: strings(data.mentions).length ? strings(data.mentions) : [...content.matchAll(/@([\w.-]+)/g)].map(match => match[1].toLowerCase()),
      createdAt: millis(data.createdAt || data.timestamp || data.postedAt),
      reactions: data.reactions && typeof data.reactions === "object" ? Object.fromEntries(Object.entries(data.reactions).map(([key, value]) => [key, String(value)])) : {},
      likes: strings(data.likes),
      commentCount,
      shareCount: Math.max(Number(data.shareCount || data.sharesCount || 0), strings(data.shares).length),
      latestComment,
    } satisfies CommunityPost;
  }));
  return [...new Map(posts.map(post => [`${post.source}/${post.id}`, post])).values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createCommunityPost(uid: string, profile: AccountProfile, content: string, image?: File): Promise<void> {
  const hashtags = [...new Set([...content.matchAll(/#([\w-]+)/g)].map(match => match[1].toLowerCase()))];
  const mentions = [...new Set([...content.matchAll(/@([\w.-]+)/g)].map(match => match[1].toLowerCase()))];
  let imageUrl = ""; let imagePath = "";
  if (image) {
    if (!image.type.startsWith("image/")) throw new Error("The attachment must be an image.");
    if (image.size > 8 * 1024 * 1024) throw new Error("The image must be smaller than 8 MB.");
    imagePath = `community_posts/${uid}/${Date.now()}_${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploaded = await uploadBytes(ref(storage, imagePath), image, { contentType: image.type }); imageUrl = await getDownloadURL(uploaded.ref);
  }
  try {
    const now = new Date(); const part = (value: number) => String(value).padStart(2, "0");
    const tweetId = `${uid}_${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}_${part(now.getHours())}${part(now.getMinutes())}${part(now.getSeconds())}`;
    await setDoc(doc(db, tweetSource, tweetId), { userId: uid, user: uid, content, timestamp: serverTimestamp(), createdAt: serverTimestamp(), likes: [], shares: [], reactions: {}, locked: false, imageUrl: imageUrl || null, imagePath: imagePath || null, hashtags, mentionedUserIds: mentions, source: "web" });
  } catch (error) { if (imagePath) await deleteObject(ref(storage, imagePath)).catch(() => undefined); throw error; }
}

export async function deleteCommunityPost(uid: string, post: CommunityPost): Promise<void> {
  if (post.authorUid !== uid) throw new Error("You can only delete your own posts.");
  await deleteDoc(doc(db, post.source, post.id));
  if (post.imageUrl || post.imagePath) await deleteObject(ref(storage, post.imagePath || post.imageUrl)).catch(() => undefined);
}

export async function updateCommunityPost(uid: string, post: CommunityPost, content: string): Promise<void> {
  if (post.authorUid !== uid) throw new Error("You can only edit your own posts.");
  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("A post cannot be empty.");
  if (cleanContent.length > 5000) throw new Error("A post cannot exceed 5,000 characters.");
  const hashtags = [...new Set([...cleanContent.matchAll(/#([\w-]+)/g)].map(match => match[1].toLowerCase()))];
  const mentions = [...new Set([...cleanContent.matchAll(/@([\w.-]+)/g)].map(match => match[1].toLowerCase()))];
  await updateDoc(doc(db, post.source, post.id), { content: cleanContent, hashtags, mentionedUserIds: mentions, updatedAt: serverTimestamp(), edited: true });
}

export async function getFollowingIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, "follows"), where("followerId", "==", uid)));
  return new Set(snapshot.docs.map(entry => String(entry.data().followingId || "")).filter(Boolean));
}

async function getCommunityUser(uid: string): Promise<Record<string, unknown>> {
  const paths = [["users", "students", "students", uid], ["users", "companies", "companies", uid], ["users", "authorities", "authorities", uid]];
  for (const path of paths) { try { const profile = await getDoc(doc(db, path.join("/"))); if (profile.exists()) return profile.data(); } catch { /* Try the next role path. */ } }
  const adminId = uid.replace(/^admin_/, "");
  try { const admin = await getDoc(doc(db, "admins", adminId)); if (admin.exists()) return { ...admin.data(), role: admin.data().role || "admin", uid: `admin_${adminId}` }; } catch { /* Return the tweet snapshot fallback below. */ }
  return {};
}

export async function getCommunityMemberProfile(uid: string, roleHint = "member"): Promise<CommunityMemberProfile> {
  const profile = await getCommunityUser(uid);
  const role = String(profile.role || roleHint || "member").toLowerCase();
  const skills = Array.isArray(profile.skills) ? profile.skills.filter((value): value is string => typeof value === "string") : [];
  return {
    uid, role, name: communityName(profile), username: String(profile.username || ""), imageUrl: communityImage(profile),
    bio: String(profile.bio || profile.description || ""), category: String(profile.courseOfStudy || profile.industry || profile.authorityType || ""),
    organisation: String(profile.institution || profile.school || ""), level: String(profile.level || ""), state: String(profile.state || profile.stateOfOrigin || ""),
    address: String(profile.address || ""), skills, website: String(profile.website || ""), linkedinUrl: String(profile.linkedinUrl || ""),
    githubUrl: String(profile.githubUrl || ""), portfolioUrl: String(profile.portfolioUrl || ""),
    verified: profile.isVerified === true || profile.verified === true,
  };
}

export async function setPostReaction(uid: string, postId: string, reaction: string | null): Promise<void> {
  const tweet = doc(db, tweetSource, postId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(tweet); if (!snapshot.exists()) throw new Error("This post no longer exists.");
    const data = snapshot.data(); const reactions = { ...(data.reactions || {}) } as Record<string, string>; const likes = strings(data.likes).filter(id => id !== uid);
    if (reaction) { reactions[uid] = reaction; likes.push(uid); } else delete reactions[uid];
    transaction.update(tweet, { reactions, likes, reactionCount: Object.keys(reactions).length, likeCount: likes.length, updatedAt: serverTimestamp() });
  });
}

export async function recordPostShare(uid: string, postId: string): Promise<boolean> {
  const tweet = doc(db, tweetSource, postId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(tweet); if (!snapshot.exists()) throw new Error("This post no longer exists.");
    const shares = strings(snapshot.data().shares);
    if (shares.includes(uid)) return false;
    shares.push(uid);
    transaction.update(tweet, { shares, shareCount: shares.length, updatedAt: serverTimestamp() });
    return true;
  });
}

export async function listPostComments(postId: string): Promise<CommunityComment[]> {
  const snapshot = await getDocs(query(collection(db, tweetSource, postId, "comments"), orderBy("timestamp", "asc"), limit(100)));
  return Promise.all(snapshot.docs.map(async entry => {
    const data = entry.data(); const uid = String(data.userId || ""); const profile = uid ? await getCommunityUser(uid) : {};
    return { id: entry.id, userId: uid, userName: communityName(profile, data.user), userImage: communityImage(profile, data.userImage), content: String(data.content || ""), createdAt: millis(data.timestamp || data.createdAt) };
  }));
}

export async function addPostComment(uid: string, profile: AccountProfile, postId: string, content: string): Promise<void> {
  await addDoc(collection(db, tweetSource, postId, "comments"), { userId: uid, user: profile.name, userImage: profile.imageUrl || "", content: content.trim(), timestamp: serverTimestamp(), likes: [], locked: false });
}

export async function deletePostComment(uid: string, postId: string, comment: CommunityComment): Promise<void> {
  if (comment.userId !== uid) throw new Error("You can only delete your own comments.");
  await deleteDoc(doc(db, tweetSource, postId, "comments", comment.id));
}

export async function updatePostComment(uid: string, postId: string, comment: CommunityComment, content: string): Promise<void> {
  if (comment.userId !== uid) throw new Error("You can only edit your own comments.");
  await updateDoc(doc(db, tweetSource, postId, "comments", comment.id), { content: content.trim(), updatedAt: serverTimestamp() });
}

export async function listCommentReplies(postId: string, commentId: string): Promise<CommunityReply[]> {
  const snapshot = await getDocs(query(collection(db, tweetSource, postId, "comments", commentId, "replies"), orderBy("postedAt", "asc"), limit(100)));
  return Promise.all(snapshot.docs.map(async entry => {
    const data = entry.data(); const uid = String(data.userId || data.studentId || ""); const profile = uid ? await getCommunityUser(uid) : {};
    return { id: entry.id, userId: uid, userName: communityName(profile, data.studentName), userImage: communityImage(profile, data.studentImage), content: String(data.content || ""), createdAt: millis(data.postedAt || data.createdAt), parentReplyId: String(data.parentReplyId || ""), userReplyingTo: String(data.userReplyingTo || "") };
  }));
}

export async function addCommentReply(uid: string, profile: AccountProfile, postId: string, commentId: string, content: string, parent?: CommunityReply): Promise<void> {
  const mentions = [...new Set([...content.matchAll(/@([\w.-]+)/g)].map(match => match[1].toLowerCase()))];
  await addDoc(collection(db, tweetSource, postId, "comments", commentId, "replies"), { userId: uid, studentId: uid, studentName: profile.name, studentImage: profile.imageUrl || "", commentId, tweetId: postId, content: content.trim(), postedAt: serverTimestamp(), createdAt: serverTimestamp(), likes: [], reactions: {}, shares: [], mentions, parentReplyId: parent?.id || null, userReplyingTo: parent?.userName || null, mentionedUserId: parent?.userId || null });
}

export async function updateCommentReply(uid: string, postId: string, commentId: string, reply: CommunityReply, content: string): Promise<void> {
  if (reply.userId !== uid) throw new Error("You can only edit your own replies.");
  await updateDoc(doc(db, tweetSource, postId, "comments", commentId, "replies", reply.id), { content: content.trim(), updatedAt: serverTimestamp() });
}

export async function deleteCommentReply(uid: string, postId: string, commentId: string, reply: CommunityReply): Promise<void> {
  if (reply.userId !== uid) throw new Error("You can only delete your own replies.");
  await deleteDoc(doc(db, tweetSource, postId, "comments", commentId, "replies", reply.id));
}

export async function getSavedPostIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, "savedTweets"), where("userId", "==", uid)));
  return new Set(snapshot.docs.map(entry => String(entry.data().tweetId || "")).filter(Boolean));
}

export async function toggleSavedPost(uid: string, postId: string, saved: boolean): Promise<void> {
  const matches = await getDocs(query(collection(db, "savedTweets"), where("userId", "==", uid), where("tweetId", "==", postId), limit(10)));
  if (saved) { await Promise.all(matches.docs.map(entry => deleteDoc(entry.ref))); return; }
  const now = new Date(); const part = (value: number) => String(value).padStart(2, "0");
  const savedId = `${uid}_${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}_${part(now.getHours())}${part(now.getMinutes())}${part(now.getSeconds())}`;
  await setDoc(doc(db, "savedTweets", savedId), { userId: uid, tweetId: postId, savedAt: serverTimestamp() });
}

export async function reportCommunityPost(uid: string, post: CommunityPost, reason: string): Promise<void> {
  await addDoc(collection(db, "communityReports"), { tweetId: post.id, reporterId: uid, authorId: post.authorUid, reason: reason.trim(), status: "open", createdAt: serverTimestamp(), source: "web" });
}
