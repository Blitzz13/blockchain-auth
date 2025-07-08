import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';

import { AuthService } from './auth.service';
import { Token } from './schema/token.schema';

// Mock data and mock implementations
const mockToken = {
  userId: 'user123',
  accessToken: 'valid.access.token',
  refreshToken: 'valid.refresh.token',
  isValid: true,
};

// A more robust mock that correctly handles static and instance methods
const mockTokenModel = Object.assign(
  jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(mockToken),
  })),
  {
    findOne: jest.fn().mockResolvedValue(mockToken),
    findOneAndUpdate: jest.fn().mockResolvedValue(mockToken),
    updateMany: jest.fn().mockResolvedValue({ nModified: 1 }),
  },
);

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed.jwt.token'),
  verify: jest.fn().mockReturnValue({ userId: 'user123' }),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key.includes('ACCESS')) {
      return 'access_secret';
    }

    if (key.includes('REFRESH')) {
      return 'refresh_secret';
    }

    return '3600s';
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let tokenModel: Model<Token>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(Token.name), useValue: mockTokenModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenModel = module.get<Model<Token>>(getModelToken(Token.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  // Reset mocks before each test to ensure isolation
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        userId: 'user123',
        email: 'test@test.com',
        username: 'test',
      };
      const tokens = service.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveTokens', () => {
    it('should save new tokens to the database', async () => {
      const result = await service.saveTokens('user123', 'access', 'refresh');

      expect(mockTokenModel).toHaveBeenCalledWith({
        userId: 'user123',
        accessToken: 'access',
        refreshToken: 'refresh',
        isValid: true,
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe('invalidateTokensByAccessToken', () => {
    it('should call findOneAndUpdate with correct parameters', async () => {
      await service.invalidateTokensByAccessToken('some.access.token');
      expect(tokenModel.findOneAndUpdate).toHaveBeenCalledWith(
        { accessToken: 'some.access.token' },
        { isValid: false },
      );
    });
  });

  describe('invalidateTokensByRefreshToken', () => {
    it('should call findOneAndUpdate with correct parameters', async () => {
      await service.invalidateTokensByRefreshToken('some.refresh.token');
      expect(tokenModel.findOneAndUpdate).toHaveBeenCalledWith(
        { refreshToken: 'some.refresh.token' },
        { isValid: false },
      );
    });
  });

  describe('refreshToken', () => {
    it('should update the access token for a given refresh token', async () => {
      await service.refreshToken('some.refresh.token', 'new.access.token');
      expect(tokenModel.findOneAndUpdate).toHaveBeenCalledWith(
        { refreshToken: 'some.refresh.token' },
        { accessToken: 'new.access.token' },
      );
    });
  });

  describe('getUserIdByToken', () => {
    it('should return a userId for a valid access token', async () => {
      const userId = await service.getUserIdByToken('valid.access.token');

      expect(tokenModel.findOne).toHaveBeenCalledWith({
        accessToken: 'valid.access.token',
      });
      expect(userId).toBe(mockToken.userId);
    });

    it('should return null if token is not found', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      const userId = await service.getUserIdByToken('not.found.token');

      expect(userId).toBeNull();
    });
  });

  describe('getUserIdByRefreshToken', () => {
    it('should return a userId for a valid refresh token', async () => {
      const userId = await service.getUserIdByRefreshToken(
        'valid.refresh.token',
      );

      expect(tokenModel.findOne).toHaveBeenCalledWith({
        refreshToken: 'valid.refresh.token',
      });
      expect(userId).toBe(mockToken.userId);
    });

    it('should return null if token is not found', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      const userId = await service.getUserIdByRefreshToken('not.found.token');

      expect(userId).toBeNull();
    });
  });

  describe('isAccessTokenValid', () => {
    it('should return true for a valid access token', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce({
        ...mockToken,
        isValid: true,
      });
      (jwtService.verify as jest.Mock).mockReturnValueOnce({
        userId: 'user123',
      });
      const isValid = await service.isAccessTokenValid('valid.access.token');

      expect(isValid).toBe(true);
    });

    it('should throw "Token not found" if token record does not exist', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.isAccessTokenValid('not.found.token'),
      ).rejects.toThrow('Token not found');
    });
  });

  describe('invalidateAllUserTokens', () => {
    it('should call updateMany to invalidate all tokens for a user', async () => {
      await service.invalidateAllUserTokens('user123');
      expect(tokenModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123' },
        { isValid: false },
      );
    });
  });

  describe('isRefreshTokenValid', () => {
    it('should return true for a valid refresh token', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce({
        ...mockToken,
        isValid: true,
      });
      (jwtService.verify as jest.Mock).mockReturnValueOnce({
        userId: 'user123',
      });
      const isValid = await service.isRefreshTokenValid('valid.refresh.token');

      expect(isValid).toBe(true);
    });

    it('should throw "Token not found" if token record does not exist', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.isRefreshTokenValid('not.found.token'),
      ).rejects.toThrow('Token not found');
    });

    it('should return false if token is marked as invalid', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce({
        ...mockToken,
        isValid: false,
      });
      const isValid = await service.isRefreshTokenValid(
        'invalid.refresh.token',
      );

      expect(isValid).toBe(false);
    });

    it('should return false if JWT verification fails', async () => {
      (tokenModel.findOne as jest.Mock).mockResolvedValueOnce({
        ...mockToken,
        isValid: true,
      });
      (jwtService.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });
      const isValid = await service.isRefreshTokenValid('bad.sig.token');

      expect(isValid).toBe(false);
    });
  });
});
