import mongoose from 'mongoose';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { loggerService } from '../services/loggerService.js';

const UserSchema = new mongoose.Schema(
    {
        // Wallet Address as Primary Identifier
        walletAddress: {
            type: String,
            required: true,
            unique: true,
            validate: {
                validator: function (v) {
                    // Validate Ethereum address format
                    try {
                        return ethers.utils.isAddress(v);
                    } catch (error) {
                        loggerService.warn(`Invalid wallet address format: ${v}`);
                        return false;
                    }
                },
                message: (props) => `Invalid Ethereum address: ${props.value}`,
            },
            lowercase: true, // Normalize address to lowercase
            trim: true,
        },

        // Optional Metadata Fields
        profile: {
            displayName: {
                type: String,
                trim: true,
                maxlength: [50, 'Display name cannot exceed 50 characters'],
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
                sparse: true, // Allows null values while maintaining unique index
                validate: {
                    validator: function (v) {
                        // Optional email validation
                        return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
                    },
                    message: (props) => `Invalid email format: ${props.value}`,
                },
            },
        },

        // Authentication-related Fields
        authentication: {
            currentNonce: {
                type: String,
                default: null,
            },
            lastNonceGeneratedAt: {
                type: Date,
                default: null,
            },
            authAttempts: {
                type: Number,
                default: 0,
                max: [10, 'Too many authentication attempts'],
            },
            lockedUntil: {
                type: Date,
                default: null,
            },
        },

        // Security Tracking
        security: {
            lastLogin: {
                type: Date,
                default: null,
            },
            loginHistory: [
                {
                    timestamp: { type: Date, default: Date.now },
                    ipAddress: {
                        type: String,
                        validate: {
                            validator: function (v) {
                                // Basic IP address validation
                                return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
                            },
                            message: (props) => `Invalid IP address: ${props.value}`,
                        },
                    },
                    geolocation: {
                        country: String,
                        city: String,
                    },
                },
            ],
        },

        // Compliance and Authorization
        compliance: {
            kycVerified: {
                type: Boolean,
                default: false,
            },
            roles: {
                type: [String],
                enum: ['user', 'issuer', 'admin', 'reviewer'],
                default: ['user'],
            },
        },

        // Blacklist and Risk Management
        status: {
            type: String,
            enum: ['active', 'suspended', 'blacklisted'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook for additional security checks
UserSchema.pre('save', function (next) {
    if (this.walletAddress) {
        this.walletAddress = this.walletAddress.toLowerCase();
    }

    if (this.authentication.lockedUntil && this.authentication.lockedUntil < new Date()) {
        this.authentication.lockedUntil = null;
        this.authentication.authAttempts = 0;
    }

    next();
});

// Schema Methods
UserSchema.methods = {
    incrementAuthAttempts: async function () {
        this.authentication.authAttempts++;

        if (this.authentication.authAttempts >= 5) {
            this.authentication.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        }

        return this.save();
    },

    resetAuthAttempts: async function () {
        this.authentication.authAttempts = 0;
        this.authentication.lockedUntil = null;
        return this.save();
    },

    isLocked: function () {
        return this.authentication.lockedUntil && this.authentication.lockedUntil > new Date();
    },

    recordLoginAttempt: async function (ipAddress, geolocation = {}) {
        if (this.security.loginHistory.length >= 10) {
            this.security.loginHistory.shift(); // Limit to last 10 entries
        }

        this.security.loginHistory.push({
            ipAddress,
            geolocation,
            timestamp: new Date(),
        });

        return this.save();
    },
};

// Logging Hooks
UserSchema.post('save', function (doc) {
    loggerService.info(`User document saved: ${doc.walletAddress}`);
});

UserSchema.post('findOneAndUpdate', function (doc) {
    loggerService.info(`User document updated: ${doc.walletAddress}`);
});

// Export the Model
const userModel = mongoose.model('userModel', UserSchema);
export { userModel };
