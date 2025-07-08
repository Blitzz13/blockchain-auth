import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';

import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { AuthService } from '../auth/auth.service';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<User>;
  let authService: AuthService;

  // Mock data
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
  };

  // Mock Mongoose Model
  const mockUserModel = Object.assign(
    jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockUser),
    })),
    {
      findOne: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockUser),
      })),
      findOneAndUpdate: jest.fn().mockResolvedValue(mockUser),
    },
  );

  // Mock AuthService
  const mockAuthService = {
    invalidateAllUserTokens: jest.fn().mockResolvedValue(null),
    generateTokens: jest.fn().mockResolvedValue({
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
      expiresIn: '3600s',
    }),
    saveTokens: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createUserDto: UserRegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      };
      const result = await service.create(createUserDto);

      // Check that the constructor was called with the right data
      expect(mockUserModel).toHaveBeenCalledWith(createUserDto);

      // ✅ FIXED: Check that the final result is the expected user object.
      // This implicitly confirms that the save operation was successful.
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should login a user and return tokens on success', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const loginDto = { email: 'test@example.com', password: 'password' };
      const result = await service.login(loginDto);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: loginDto.email });
      expect(authService.invalidateAllUserTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(authService.generateTokens).toHaveBeenCalled();
      expect(authService.saveTokens).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'new.access.token');
    });

    it('should throw NOT_FOUND if user does not exist', async () => {
      (userModel.findOne as jest.Mock).mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });
      const loginDto = { email: 'notfound@example.com', password: 'password' };

      await expect(service.login(loginDto)).rejects.toThrow(
        new HttpException(
          `User with email ${loginDto.email} was not found`,
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw UNAUTHORIZED if password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };

      await expect(service.login(loginDto)).rejects.toThrow(
        new HttpException(
          `Email and password are not mathcing for user ${loginDto.email}`,
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });

  describe('updatePasswordById', () => {
    it('should update the password if current password matches', async () => {
      const mockUserWithSave = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        save: jest.fn().mockResolvedValue(true),
      };

      (userModel.findOne as jest.Mock).mockResolvedValue(mockUserWithSave);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const updateDto = {
        currentPassword: 'hashedpassword',
        newPassword: 'newpassword',
      };

      // 4. Run the service method.
      await service.updatePasswordById('user123', updateDto);

      // 5. Assert that the .save() method was called.
      expect(mockUserWithSave.save).toHaveBeenCalled();
    });

    it('should throw UNAUTHORIZED if current password does not match', async () => {
      // Also provide the correct mock for the failure path.
      (userModel.findOne as jest.Mock).mockResolvedValue({
        password: 'hashedpassword',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const updateDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
      };

      await expect(
        service.updatePasswordById('user123', updateDto),
      ).rejects.toThrow(
        new HttpException(
          'Current password is incorrect',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });
});
