-- AlterEnum: add STAFF role (order handling, read-only catalog access)
ALTER TYPE "Role" ADD VALUE 'STAFF' BEFORE 'CUSTOMER';
