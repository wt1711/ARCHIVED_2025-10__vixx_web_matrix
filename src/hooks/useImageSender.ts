import { useState } from 'react';
import ImagePicker from 'react-native-image-picker';
import { useMatrixClient } from './useMatrixClient';
import { EventType, MsgType } from 'matrix-js-sdk';

export interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  fileSize?: number;
}

export const useImageSender = (roomId: string | null) => {
  const { client } = useMatrixClient();
  const [isUploading, setIsUploading] = useState(false);

  const pickAndSendImage = async (): Promise<void> => {
    if (!client || !roomId) {
      throw new Error('Cannot send image: client or roomId not available');
    }

    // // Request permission
    // const permissionResult =
    //   await ImagePicker.requestCameraRollPermissions();
    // if (!permissionResult.granted) {
    //   throw new Error('Permission to access gallery was denied');
    // }

    // Launch picker
    const result = await ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return; // User cancelled
    }

    const asset = result.assets[0];
    const imageInfo: ImageInfo = {
      uri: asset.uri || '',
      width: asset.width || 0,
      height: asset.height || 0,
      mimeType: asset.type || 'image/jpeg',
      fileName: asset.fileName || `image_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
    };

    await uploadAndSendImage(imageInfo);
  };

  const uploadAndSendImage = async (imageInfo: ImageInfo): Promise<void> => {
    if (!client || !roomId) {
      throw new Error('Cannot send image: client or roomId not available');
    }

    setIsUploading(true);

    try {
      // Fetch the image as blob
      const response = await fetch(imageInfo.uri);
      const blob = await response.blob();

      // Upload to Matrix media repository
      const uploadResponse = await client.uploadContent(blob, {
        name: imageInfo.fileName,
        type: imageInfo.mimeType,
      });

      const contentUri = uploadResponse.content_uri;

      // Send m.image message
      await client.sendEvent(roomId, EventType.RoomMessage, {
        msgtype: MsgType.Image,
        body: imageInfo.fileName,
        url: contentUri,
        info: {
          h: imageInfo.height,
          w: imageInfo.width,
          mimetype: imageInfo.mimeType,
          size: imageInfo.fileSize,
        },
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { pickAndSendImage, isUploading };
};
