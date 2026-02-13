#!/bin/bash
set -e

echo "Deploying to Vercel production..."
vercel --prod

echo "Done! Live at https://logan-valentines-day.vercel.app"
