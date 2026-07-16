import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { compressAndUpload, resolveFileUrl } from '../../src/camera/imageUpload';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { MULTIPART: 'multipart' },
}));

describe('imageUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file://compressed.jpg' });
  });

  test('compressAndUpload posts to the visitor-images upload endpoint and returns the app-relative path', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
      status: 201,
      body: JSON.stringify({ fileName: 'photo.jpg', imageUrl: 'files/visitor-images/soc-1/abc.jpg' }),
    });

    const result = await compressAndUpload('file://original.jpg', 'soc-1');

    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
      expect.stringContaining('/societies/soc-1/visitors/images/upload'),
      'file://compressed.jpg',
      expect.objectContaining({ httpMethod: 'POST', fieldName: 'file' })
    );
    expect(result).toBe('files/visitor-images/soc-1/abc.jpg');
  });

  test('compressAndUpload throws when the server responds with a non-2xx status', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({ status: 500, body: '{}' });

    await expect(compressAndUpload('file://original.jpg', 'soc-1')).rejects.toThrow('Upload failed with status 500');
  });

  test('resolveFileUrl prefixes an app-relative path with the API base URL', () => {
    const url = resolveFileUrl('files/visitor-images/soc-1/abc.jpg');
    expect(url.endsWith('/files/visitor-images/soc-1/abc.jpg')).toBe(true);
    expect(url.startsWith('http')).toBe(true);
  });
});
