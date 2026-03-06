/**
 * @module js.util.video.helper
 * @description Get video thumbnail.
 */

/**
 * @class VideoHelper
 * @classdesc Extracts a frame from a video file to use as a preview.
 */
class VideoHelper {

	static getThumbnail(file, seekTo = 1) {

		return new Promise((resolve) => {

			const video = document.createElement('video');
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			video.preload = 'metadata';
			video.src = URL.createObjectURL(file);
			video.muted = true;
			video.playsInline = true;

			video.onloadeddata = () => {
				video.currentTime = seekTo;
			};

			video.onseeked = () => {
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				const dataUrl = canvas.toDataURL('image/jpeg');
				URL.revokeObjectURL(video.src);
				resolve(dataUrl);
			};

			video.onerror = () => resolve(null);
		});

	}
	
}

export default VideoHelper;