-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "themePrimaryColor" TEXT DEFAULT '#01402E',
ADD COLUMN "themeSecondaryColor" TEXT DEFAULT '#65B32E',
ADD COLUMN "themeAccentColor" TEXT DEFAULT '#DE1915';
