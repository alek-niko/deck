/**
 * @class MediaUtil
 * @description Static utilities for CyberDeck media handling.
 */
export class MediaUtil {
	/**
	 * Shards a filename into a path for S3/CDN delivery.
	 * @param {string} filename - e.g., "VfdbnxBGBDC.webp"
	 * @returns {string} - e.g., "/Vf/db/VfdbnxBGBDC.webp"
	 */
	static shard(filename) {
		if (!filename || filename.length < 4) return `/${filename}`;
		
		const s1 = filename.substring(0, 2);
		const s2 = filename.substring(2, 4);
		
		return `/${s1}/${s2}/${filename}`;
	}

	/**
	 * Optional: Helper to build the full CDN URL
	 */
	static getFullUrl(filename, baseUrl = 'https://cdn.website.com') {
		if (!filename) return '';
		return `${baseUrl}${this.shard(filename)}`;
	}
}