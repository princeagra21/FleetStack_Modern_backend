-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AssociateType" AS ENUM ('USER', 'VEHICLE', 'DRIVER');

-- CreateEnum
CREATE TYPE "public"."BodyContentType" AS ENUM ('JSON', 'FORM_URLENCODED', 'XML', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."CreditActivity" AS ENUM ('ASSIGN', 'DEDUCT', 'RENEW');

-- CreateEnum
CREATE TYPE "public"."DisplayMode" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "public"."DistanceUnit" AS ENUM ('KM', 'MILES');

-- CreateEnum
CREATE TYPE "public"."DocFor" AS ENUM ('USER', 'DRIVER', 'VEHICLE');

-- CreateEnum
CREATE TYPE "public"."DriverVehicleActivity" AS ENUM ('ASSIGN', 'UNASSIGN');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('IGNITION', 'GEOFENCE', 'REMINDER', 'OVERSPEED');

-- CreateEnum
CREATE TYPE "public"."GeocodingData" AS ENUM ('TWO_DIGIT', 'THREE_DIGIT');

-- CreateEnum
CREATE TYPE "public"."GeofenceType" AS ENUM ('POLYGON', 'LINE', 'CIRCLE');

-- CreateEnum
CREATE TYPE "public"."HttpMethod" AS ENUM ('GET', 'POST');

-- CreateEnum
CREATE TYPE "public"."LoginRefType" AS ENUM ('USER', 'DRIVER');

-- CreateEnum
CREATE TYPE "public"."LoginType" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER', 'SUBUSER');

-- CreateEnum
CREATE TYPE "public"."NoteAssociateType" AS ENUM ('USER', 'VEHICLE', 'DRIVER');

-- CreateEnum
CREATE TYPE "public"."NotifyAdvanceUnit" AS ENUM ('DAYS', 'KM', 'HOURS');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."RecurrenceType" AS ENUM ('TIME', 'MILEAGE', 'ENGINE_HOURS');

-- CreateEnum
CREATE TYPE "public"."ReminderAdvanceUnit" AS ENUM ('DAYS', 'KM', 'HOURS');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'DUE', 'OVERDUE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."SensorDataType" AS ENUM ('FLOAT', 'INT', 'BOOL', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."SmtpType" AS ENUM ('SSL', 'NONE', 'TLS');

-- CreateEnum
CREATE TYPE "public"."TextDirection" AS ENUM ('RTL', 'LTR');

-- CreateEnum
CREATE TYPE "public"."UploaderType" AS ENUM ('USER', 'DRIVER');

-- CreateTable
CREATE TABLE "public"."addresses" (
    "id" BIGSERIAL NOT NULL,
    "country_code" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "full_address" TEXT NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."command_type" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "des" TEXT,

    CONSTRAINT "command_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "website_url" TEXT,
    "custom_domain" TEXT,
    "logo_light_url" TEXT,
    "logo_dark_url" TEXT,
    "favicon_url" TEXT,
    "social_links" JSONB,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "navbar_color" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credits_logs" (
    "id" BIGSERIAL NOT NULL,
    "admin_user_id" BIGINT NOT NULL,
    "credits" INTEGER NOT NULL,
    "activity" "public"."CreditActivity" NOT NULL,
    "vehicle_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credits_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_commands" (
    "id" BIGSERIAL NOT NULL,
    "device_id" BIGINT NOT NULL,
    "command_type_id" BIGINT NOT NULL,
    "command" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "custom_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_system_variables" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "initial_value" TEXT NOT NULL,

    CONSTRAINT "custom_system_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "manufacturer" TEXT,
    "protocol" TEXT,
    "firmware_version" TEXT,

    CONSTRAINT "device_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devices" (
    "id" BIGSERIAL NOT NULL,
    "imei" TEXT NOT NULL,
    "sim_id" BIGINT,
    "device_type_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_type" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "doc_for" "public"."DocFor" NOT NULL,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_user" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "driver_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_vehicle" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,

    CONSTRAINT "driver_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_vehicle_history" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "activity" "public"."DriverVehicleActivity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by_user_id" BIGINT,

    CONSTRAINT "driver_vehicle_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."drivers" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile_code" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "address_id" BIGINT,
    "primary_user_id" BIGINT,
    "created_by_user_id" BIGINT,
    "profile_url" TEXT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attributes" JSONB,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "email_subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."files" (
    "id" BIGSERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "doc_type_id" BIGINT NOT NULL,
    "description" TEXT,
    "associate_type" "public"."AssociateType" NOT NULL,
    "associate_user_id" BIGINT,
    "associate_driver_id" BIGINT,
    "associate_vehicle_id" BIGINT,
    "uploaded_by_type" "public"."UploaderType" NOT NULL,
    "uploaded_by_user_id" BIGINT,
    "uploaded_by_driver_id" BIGINT,
    "file_type" TEXT,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "expiry_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_visible_driver" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."geofence" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "des" TEXT,
    "type" "public"."GeofenceType" NOT NULL,
    "color" TEXT,
    "geodata" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."login_logs" (
    "id" BIGSERIAL NOT NULL,
    "ref_type" "public"."LoginRefType" NOT NULL,
    "user_id" BIGINT,
    "driver_id" BIGINT,
    "ip" TEXT,
    "browser" TEXT,
    "platform" TEXT,
    "header" JSONB,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notes" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "type" "public"."NoteAssociateType" NOT NULL,
    "associate_user_id" BIGINT,
    "associate_vehicle_id" BIGINT,
    "associate_driver_id" BIGINT,
    "created_by_user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "remark" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_ref" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permission_groups" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" BIGSERIAL NOT NULL,
    "group_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pricing_plan" (
    "id" BIGSERIAL NOT NULL,
    "admin_user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "features" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pricing_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_role_id" BIGINT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sensors" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "unit" TEXT,
    "raw_attribute" TEXT NOT NULL,
    "custom_js" TEXT,
    "data_type" "public"."SensorDataType" NOT NULL,
    "description" TEXT,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."share_public_link" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "unique_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_at" TIMESTAMP(3),
    "is_geofence" BOOLEAN NOT NULL DEFAULT false,
    "is_history" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "share_public_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sharelink_vehicle" (
    "id" BIGSERIAL NOT NULL,
    "sharelink_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,

    CONSTRAINT "sharelink_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sim_provider" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "apn_name" TEXT,
    "apn_user" TEXT,
    "apn_password" TEXT,

    CONSTRAINT "sim_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sims" (
    "id" BIGSERIAL NOT NULL,
    "sim_number" BIGINT NOT NULL,
    "imsi" BIGINT,
    "provider_id" BIGINT,
    "iccid" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smtp_settings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "type" "public"."SmtpType" NOT NULL DEFAULT 'NONE',
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "reply_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."software_config" (
    "id" BIGSERIAL NOT NULL,
    "geocoding_data" "public"."GeocodingData" NOT NULL DEFAULT 'TWO_DIGIT',
    "sso_url" TEXT,
    "backup_days" INTEGER,
    "openai_api_key" TEXT,
    "currency_code" TEXT NOT NULL,

    CONSTRAINT "software_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_notification_settings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "event_type" "public"."EventType" NOT NULL,
    "notify_email" BOOLEAN NOT NULL DEFAULT false,
    "notify_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "notify_web_push" BOOLEAN NOT NULL DEFAULT false,
    "notify_mobile_push" BOOLEAN NOT NULL DEFAULT false,
    "notify_telegram" BOOLEAN NOT NULL DEFAULT false,
    "notify_sms" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "date_format" TEXT,
    "language_code" TEXT,
    "distance_unit" "public"."DistanceUnit" NOT NULL DEFAULT 'KM',
    "mode" "public"."DisplayMode" NOT NULL DEFAULT 'LIGHT',
    "direction" "public"."TextDirection" NOT NULL DEFAULT 'LTR',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_vehicle_assign" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,

    CONSTRAINT "user_vehicle_assign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_vehicle_group" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "group_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_vehicle_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "uid" BIGSERIAL NOT NULL,
    "login_type" "public"."LoginType" NOT NULL,
    "role_id" BIGINT,
    "parent_user_id" BIGINT,
    "address_id" BIGINT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "mobile_prefix" TEXT,
    "mobile_number" TEXT,
    "profile_url" TEXT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "credits" BIGINT NOT NULL DEFAULT 0,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "public"."vehicle_geofence_settings" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "geofence_id" BIGINT NOT NULL,
    "entry_notify" BOOLEAN NOT NULL DEFAULT false,
    "exit_notify" BOOLEAN NOT NULL DEFAULT false,
    "inside_stay_minutes" INTEGER,
    "notify_inside" BOOLEAN NOT NULL DEFAULT false,
    "outside_stay_minutes" INTEGER,
    "notify_outside" BOOLEAN NOT NULL DEFAULT false,
    "entry_execute_command" BOOLEAN NOT NULL DEFAULT false,
    "exit_execute_command" BOOLEAN NOT NULL DEFAULT false,
    "entry_command" TEXT,
    "exit_command" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_notified_at" TIMESTAMP(3),

    CONSTRAINT "vehicle_geofence_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_groups" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "vehicle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_reminder" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "reminder_type_id" BIGINT NOT NULL,
    "note" TEXT,
    "last_done_date" TIMESTAMP(3),
    "last_done_km" INTEGER,
    "last_done_engine_hours" INTEGER,
    "next_due_date" TIMESTAMP(3),
    "next_due_km" INTEGER,
    "next_due_engine_hours" INTEGER,
    "notify_trigger_value" INTEGER,
    "recurrence_interval_text" TEXT,
    "notify_advance_value" INTEGER,
    "notify_advance_unit" "public"."ReminderAdvanceUnit" NOT NULL,
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_reminder_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "des" TEXT,
    "recurrence_type" "public"."RecurrenceType" NOT NULL,
    "recurrence_interval" BIGINT NOT NULL,
    "notify_advance_value" BIGINT NOT NULL,
    "notify_advance_unit" "public"."NotifyAdvanceUnit" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicle_reminder_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicles" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vin" TEXT,
    "plate_number" TEXT,
    "device_id" BIGINT,
    "vehicle_type_id" BIGINT,
    "primary_user_id" BIGINT,
    "added_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primary_expiry" TIMESTAMP(3),
    "secondary_expiry" TIMESTAMP(3),
    "plan_id" BIGINT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "previous_lat" DOUBLE PRECISION,
    "previous_lon" DOUBLE PRECISION,
    "ignition" BOOLEAN NOT NULL DEFAULT false,
    "speed" DOUBLE PRECISION,
    "engine_hours" DOUBLE PRECISION,
    "odometer" DOUBLE PRECISION,
    "attributes" JSONB,
    "vehicle_meta" JSONB,
    "gmt_offset" TEXT,
    "last_update" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicletype" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "vehicletype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook" (
    "id" BIGSERIAL NOT NULL,
    "event_type_id" BIGINT NOT NULL,
    "added_by_user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "public"."HttpMethod" NOT NULL,
    "host_url" TEXT NOT NULL,
    "headers" JSONB,
    "body_content_type" "public"."BodyContentType" NOT NULL,
    "body_content" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_events_type" (
    "id" BIGSERIAL NOT NULL,
    "event_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variables_schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "webhook_events_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addresses_city_id_idx" ON "public"."addresses"("city_id" ASC);

-- CreateIndex
CREATE INDEX "addresses_country_code_idx" ON "public"."addresses"("country_code" ASC);

-- CreateIndex
CREATE INDEX "addresses_pincode_idx" ON "public"."addresses"("pincode" ASC);

-- CreateIndex
CREATE INDEX "addresses_state_code_idx" ON "public"."addresses"("state_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "command_type_name_key" ON "public"."command_type"("name" ASC);

-- CreateIndex
CREATE INDEX "companies_user_id_idx" ON "public"."companies"("user_id" ASC);

-- CreateIndex
CREATE INDEX "credits_logs_admin_user_id_idx" ON "public"."credits_logs"("admin_user_id" ASC);

-- CreateIndex
CREATE INDEX "credits_logs_vehicle_id_idx" ON "public"."credits_logs"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "custom_commands_command_type_id_idx" ON "public"."custom_commands"("command_type_id" ASC);

-- CreateIndex
CREATE INDEX "custom_commands_device_id_idx" ON "public"."custom_commands"("device_id" ASC);

-- CreateIndex
CREATE INDEX "custom_system_variables_name_idx" ON "public"."custom_system_variables"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "custom_system_variables_name_key" ON "public"."custom_system_variables"("name" ASC);

-- CreateIndex
CREATE INDEX "devices_device_type_id_idx" ON "public"."devices"("device_type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "devices_imei_key" ON "public"."devices"("imei" ASC);

-- CreateIndex
CREATE INDEX "devices_sim_id_idx" ON "public"."devices"("sim_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "document_type_name_key" ON "public"."document_type"("name" ASC);

-- CreateIndex
CREATE INDEX "driver_user_driver_id_idx" ON "public"."driver_user"("driver_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "driver_user_driver_id_user_id_key" ON "public"."driver_user"("driver_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "driver_user_user_id_idx" ON "public"."driver_user"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicle_driver_id_key" ON "public"."driver_vehicle"("driver_id" ASC);

-- CreateIndex
CREATE INDEX "driver_vehicle_vehicle_id_idx" ON "public"."driver_vehicle"("vehicle_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicle_vehicle_id_key" ON "public"."driver_vehicle"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "driver_vehicle_history_by_user_id_idx" ON "public"."driver_vehicle_history"("by_user_id" ASC);

-- CreateIndex
CREATE INDEX "driver_vehicle_history_driver_id_idx" ON "public"."driver_vehicle_history"("driver_id" ASC);

-- CreateIndex
CREATE INDEX "driver_vehicle_history_vehicle_id_idx" ON "public"."driver_vehicle_history"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "drivers_address_id_idx" ON "public"."drivers"("address_id" ASC);

-- CreateIndex
CREATE INDEX "drivers_created_by_user_id_idx" ON "public"."drivers"("created_by_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "public"."drivers"("email" ASC);

-- CreateIndex
CREATE INDEX "drivers_is_active_idx" ON "public"."drivers"("is_active" ASC);

-- CreateIndex
CREATE INDEX "drivers_primary_user_id_idx" ON "public"."drivers"("primary_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_username_key" ON "public"."drivers"("username" ASC);

-- CreateIndex
CREATE INDEX "email_templates_language_code_idx" ON "public"."email_templates"("language_code" ASC);

-- CreateIndex
CREATE INDEX "email_templates_slug_idx" ON "public"."email_templates"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_slug_key" ON "public"."email_templates"("slug" ASC);

-- CreateIndex
CREATE INDEX "files_associate_driver_id_idx" ON "public"."files"("associate_driver_id" ASC);

-- CreateIndex
CREATE INDEX "files_associate_user_id_idx" ON "public"."files"("associate_user_id" ASC);

-- CreateIndex
CREATE INDEX "files_associate_vehicle_id_idx" ON "public"."files"("associate_vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "files_doc_type_id_idx" ON "public"."files"("doc_type_id" ASC);

-- CreateIndex
CREATE INDEX "files_uploaded_by_driver_id_idx" ON "public"."files"("uploaded_by_driver_id" ASC);

-- CreateIndex
CREATE INDEX "files_uploaded_by_user_id_idx" ON "public"."files"("uploaded_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "geofence_created_by_idx" ON "public"."geofence"("created_by" ASC);

-- CreateIndex
CREATE INDEX "geofence_is_active_idx" ON "public"."geofence"("is_active" ASC);

-- CreateIndex
CREATE INDEX "login_logs_driver_id_idx" ON "public"."login_logs"("driver_id" ASC);

-- CreateIndex
CREATE INDEX "login_logs_user_id_idx" ON "public"."login_logs"("user_id" ASC);

-- CreateIndex
CREATE INDEX "notes_associate_driver_id_idx" ON "public"."notes"("associate_driver_id" ASC);

-- CreateIndex
CREATE INDEX "notes_associate_user_id_idx" ON "public"."notes"("associate_user_id" ASC);

-- CreateIndex
CREATE INDEX "notes_associate_vehicle_id_idx" ON "public"."notes"("associate_vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "notes_created_by_user_id_idx" ON "public"."notes"("created_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "notes_type_idx" ON "public"."notes"("type" ASC);

-- CreateIndex
CREATE INDEX "payments_plan_id_idx" ON "public"."payments"("plan_id" ASC);

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_ref_key" ON "public"."payments"("transaction_ref" ASC);

-- CreateIndex
CREATE INDEX "payments_vehicle_id_idx" ON "public"."payments"("vehicle_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "permission_groups_name_key" ON "public"."permission_groups"("name" ASC);

-- CreateIndex
CREATE INDEX "permissions_group_id_idx" ON "public"."permissions"("group_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_slug_key" ON "public"."permissions"("slug" ASC);

-- CreateIndex
CREATE INDEX "pricing_plan_admin_user_id_idx" ON "public"."pricing_plan"("admin_user_id" ASC);

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "public"."role_permissions"("permission_id" ASC);

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "public"."role_permissions"("role_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "public"."role_permissions"("role_id" ASC, "permission_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name" ASC);

-- CreateIndex
CREATE INDEX "roles_parent_role_id_idx" ON "public"."roles"("parent_role_id" ASC);

-- CreateIndex
CREATE INDEX "sensors_created_by_idx" ON "public"."sensors"("created_by" ASC);

-- CreateIndex
CREATE INDEX "sensors_vehicle_id_idx" ON "public"."sensors"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "share_public_link_is_active_idx" ON "public"."share_public_link"("is_active" ASC);

-- CreateIndex
CREATE INDEX "share_public_link_unique_code_idx" ON "public"."share_public_link"("unique_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "share_public_link_unique_code_key" ON "public"."share_public_link"("unique_code" ASC);

-- CreateIndex
CREATE INDEX "share_public_link_user_id_idx" ON "public"."share_public_link"("user_id" ASC);

-- CreateIndex
CREATE INDEX "sharelink_vehicle_sharelink_id_idx" ON "public"."sharelink_vehicle"("sharelink_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sharelink_vehicle_sharelink_id_vehicle_id_key" ON "public"."sharelink_vehicle"("sharelink_id" ASC, "vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "sharelink_vehicle_vehicle_id_idx" ON "public"."sharelink_vehicle"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "sim_provider_country_code_idx" ON "public"."sim_provider"("country_code" ASC);

-- CreateIndex
CREATE INDEX "sims_provider_id_idx" ON "public"."sims"("provider_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sims_sim_number_key" ON "public"."sims"("sim_number" ASC);

-- CreateIndex
CREATE INDEX "smtp_settings_user_id_idx" ON "public"."smtp_settings"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_user_id_event_type_key" ON "public"."user_notification_settings"("user_id" ASC, "event_type" ASC);

-- CreateIndex
CREATE INDEX "user_notification_settings_user_id_idx" ON "public"."user_notification_settings"("user_id" ASC);

-- CreateIndex
CREATE INDEX "user_settings_user_id_idx" ON "public"."user_settings"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "public"."user_settings"("user_id" ASC);

-- CreateIndex
CREATE INDEX "user_vehicle_assign_user_id_idx" ON "public"."user_vehicle_assign"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_vehicle_assign_user_id_vehicle_id_key" ON "public"."user_vehicle_assign"("user_id" ASC, "vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "user_vehicle_assign_vehicle_id_idx" ON "public"."user_vehicle_assign"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "user_vehicle_group_group_id_idx" ON "public"."user_vehicle_group"("group_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_vehicle_group_vehicle_id_group_id_key" ON "public"."user_vehicle_group"("vehicle_id" ASC, "group_id" ASC);

-- CreateIndex
CREATE INDEX "user_vehicle_group_vehicle_id_idx" ON "public"."user_vehicle_group"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "users_address_id_idx" ON "public"."users"("address_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "public"."users"("is_active" ASC);

-- CreateIndex
CREATE INDEX "users_login_type_idx" ON "public"."users"("login_type" ASC);

-- CreateIndex
CREATE INDEX "users_parent_user_id_idx" ON "public"."users"("parent_user_id" ASC);

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "public"."users"("role_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username" ASC);

-- CreateIndex
CREATE INDEX "vehicle_geofence_settings_geofence_id_idx" ON "public"."vehicle_geofence_settings"("geofence_id" ASC);

-- CreateIndex
CREATE INDEX "vehicle_geofence_settings_is_active_idx" ON "public"."vehicle_geofence_settings"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_geofence_settings_vehicle_id_geofence_id_key" ON "public"."vehicle_geofence_settings"("vehicle_id" ASC, "geofence_id" ASC);

-- CreateIndex
CREATE INDEX "vehicle_geofence_settings_vehicle_id_idx" ON "public"."vehicle_geofence_settings"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "vehicle_groups_user_id_idx" ON "public"."vehicle_groups"("user_id" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_is_active_idx" ON "public"."vehicle_reminder"("is_active" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_reminder_type_id_idx" ON "public"."vehicle_reminder"("reminder_type_id" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_status_idx" ON "public"."vehicle_reminder"("status" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_vehicle_id_idx" ON "public"."vehicle_reminder"("vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_types_is_active_idx" ON "public"."vehicle_reminder_types"("is_active" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_types_notify_advance_unit_idx" ON "public"."vehicle_reminder_types"("notify_advance_unit" ASC);

-- CreateIndex
CREATE INDEX "vehicle_reminder_types_recurrence_type_idx" ON "public"."vehicle_reminder_types"("recurrence_type" ASC);

-- CreateIndex
CREATE INDEX "vehicles_added_by_user_id_idx" ON "public"."vehicles"("added_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "vehicles_device_id_idx" ON "public"."vehicles"("device_id" ASC);

-- CreateIndex
CREATE INDEX "vehicles_is_active_idx" ON "public"."vehicles"("is_active" ASC);

-- CreateIndex
CREATE INDEX "vehicles_plan_id_idx" ON "public"."vehicles"("plan_id" ASC);

-- CreateIndex
CREATE INDEX "vehicles_primary_user_id_idx" ON "public"."vehicles"("primary_user_id" ASC);

-- CreateIndex
CREATE INDEX "vehicles_vehicle_type_id_idx" ON "public"."vehicles"("vehicle_type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicletype_name_key" ON "public"."vehicletype"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicletype_slug_key" ON "public"."vehicletype"("slug" ASC);

-- CreateIndex
CREATE INDEX "webhook_added_by_user_id_idx" ON "public"."webhook"("added_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "webhook_event_type_id_idx" ON "public"."webhook"("event_type_id" ASC);

-- CreateIndex
CREATE INDEX "webhook_is_active_idx" ON "public"."webhook"("is_active" ASC);

-- CreateIndex
CREATE INDEX "webhook_events_type_event_slug_idx" ON "public"."webhook_events_type"("event_slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_type_event_slug_key" ON "public"."webhook_events_type"("event_slug" ASC);

-- CreateIndex
CREATE INDEX "webhook_events_type_is_active_idx" ON "public"."webhook_events_type"("is_active" ASC);

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credits_logs" ADD CONSTRAINT "credits_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credits_logs" ADD CONSTRAINT "credits_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_commands" ADD CONSTRAINT "custom_commands_command_type_id_fkey" FOREIGN KEY ("command_type_id") REFERENCES "public"."command_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_commands" ADD CONSTRAINT "custom_commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."device_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_device_type_id_fkey" FOREIGN KEY ("device_type_id") REFERENCES "public"."device_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_sim_id_fkey" FOREIGN KEY ("sim_id") REFERENCES "public"."sims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_user" ADD CONSTRAINT "driver_user_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_user" ADD CONSTRAINT "driver_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_vehicle" ADD CONSTRAINT "driver_vehicle_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_vehicle" ADD CONSTRAINT "driver_vehicle_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_vehicle_history" ADD CONSTRAINT "driver_vehicle_history_by_user_id_fkey" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_vehicle_history" ADD CONSTRAINT "driver_vehicle_history_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_vehicle_history" ADD CONSTRAINT "driver_vehicle_history_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drivers" ADD CONSTRAINT "drivers_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drivers" ADD CONSTRAINT "drivers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drivers" ADD CONSTRAINT "drivers_primary_user_id_fkey" FOREIGN KEY ("primary_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_associate_driver_id_fkey" FOREIGN KEY ("associate_driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_associate_user_id_fkey" FOREIGN KEY ("associate_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_associate_vehicle_id_fkey" FOREIGN KEY ("associate_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "public"."document_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_uploaded_by_driver_id_fkey" FOREIGN KEY ("uploaded_by_driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."geofence" ADD CONSTRAINT "geofence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."login_logs" ADD CONSTRAINT "login_logs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."login_logs" ADD CONSTRAINT "login_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_associate_driver_id_fkey" FOREIGN KEY ("associate_driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_associate_user_id_fkey" FOREIGN KEY ("associate_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_associate_vehicle_id_fkey" FOREIGN KEY ("associate_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permissions" ADD CONSTRAINT "permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pricing_plan" ADD CONSTRAINT "pricing_plan_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensors" ADD CONSTRAINT "sensors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensors" ADD CONSTRAINT "sensors_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."share_public_link" ADD CONSTRAINT "share_public_link_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sharelink_vehicle" ADD CONSTRAINT "sharelink_vehicle_sharelink_id_fkey" FOREIGN KEY ("sharelink_id") REFERENCES "public"."share_public_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sharelink_vehicle" ADD CONSTRAINT "sharelink_vehicle_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sims" ADD CONSTRAINT "sims_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."sim_provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smtp_settings" ADD CONSTRAINT "smtp_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_vehicle_assign" ADD CONSTRAINT "user_vehicle_assign_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_vehicle_assign" ADD CONSTRAINT "user_vehicle_assign_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_vehicle_group" ADD CONSTRAINT "user_vehicle_group_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."vehicle_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_vehicle_group" ADD CONSTRAINT "user_vehicle_group_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_geofence_settings" ADD CONSTRAINT "vehicle_geofence_settings_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "public"."geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_geofence_settings" ADD CONSTRAINT "vehicle_geofence_settings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_groups" ADD CONSTRAINT "vehicle_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_reminder" ADD CONSTRAINT "vehicle_reminder_reminder_type_id_fkey" FOREIGN KEY ("reminder_type_id") REFERENCES "public"."vehicle_reminder_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_reminder" ADD CONSTRAINT "vehicle_reminder_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_primary_user_id_fkey" FOREIGN KEY ("primary_user_id") REFERENCES "public"."users"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicletype"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."webhook" ADD CONSTRAINT "webhook_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."webhook" ADD CONSTRAINT "webhook_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."webhook_events_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

