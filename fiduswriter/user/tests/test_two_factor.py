"""
Selenium tests for two-factor authentication functionality.
"""

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.contrib.auth import get_user_model

from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import pyotp
import time


class TwoFactorTests(SeleniumHelper, StaticLiveServerTestCase):
    """Test suite for two-factor authentication features."""

    def setUp(self):
        super().setUp()
        # Create test users
        self.user1 = self.create_user(
            username="testuser1",
            email="test1@example.com",
            passtext="testpass123",
        )
        self.user2 = self.create_user(
            username="testuser2",
            email="test2@example.com",
            passtext="testpass456",
        )

        # Setup drivers
        drivers_info = self.get_drivers(1)
        self.clients = drivers_info["clients"]
        self.drivers = drivers_info["drivers"]
        self.wait_time = drivers_info["wait_time"]

        # Login user for profile access tests
        self.login_user(self.user1, self.drivers[0], self.clients[0])

        # Navigate to profile page
        self.drivers[0].get(f"{self.live_server_url}/profile/")

        # Wait for profile page to load
        WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located((By.ID, "profile-wrapper"))
        )

    def test_two_factor_status_check(self):
        """Test checking two-factor authentication status."""
        # Initial status should be disabled
        response = self.clients[0].get("/api/user/two-factor/status/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertFalse(data["enabled"])

    def test_two_factor_setup_flow(self):
        """Test the complete flow of setting up two-factor authentication."""
        # Click on setup two-factor button
        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        # Wait for the dialog to appear
        time.sleep(1)  # Allow dialog animation

        # Check that dialog elements are present
        dialog = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-dialog"
        )
        self.assertIsNotNone(dialog)

        # Check QR code container
        qr_container = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-qr-container"
        )
        self.assertIsNotNone(qr_container)

        # Check secret key is displayed
        secret_code = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-secret"
        )
        self.assertIsNotNone(secret_code)
        secret_key = secret_code.text.strip()

        # Verify secret key format (32 hex characters)
        self.assertEqual(len(secret_key), 32)
        self.assertTrue(all(c in "0123456789ABCDEF" for c in secret_key))

        # Generate a valid TOTP code using the secret
        totp = pyotp.TOTP(secret_key)
        valid_code = totp.now()

        # Enter the code
        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys(valid_code)

        # Click verify button
        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        # Wait for success
        time.sleep(2)  # Allow API call to complete

        # Check that 2FA is now enabled in UI
        enabled_status = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located(
                (By.ID, "two-factor-enabled-status")
            )
        )
        self.assertIsNotNone(enabled_status)

        # Verify via API
        response = self.clients[0].get("/api/user/two-factor/status/")
        data = response.json()
        self.assertTrue(data["enabled"])

    def test_two_factor_invalid_code(self):
        """Test that invalid codes are rejected during setup."""
        # Start setup process
        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        # Enter invalid code
        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys("000000")  # Invalid code

        # Click verify button
        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(1)

        # Verify that dialog is still open (error occurred)
        dialog = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-dialog"
        )
        self.assertIsNotNone(dialog)

        # Check that 2FA is still disabled
        response = self.clients[0].get("/api/user/two-factor/status/")
        data = response.json()
        self.assertFalse(data["enabled"])

    def test_two_factor_disable(self):
        """Test disabling two-factor authentication."""
        # First, enable 2FA
        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        secret_code = (
            self.drivers[0]
            .find_element(By.CLASS_NAME, "two-factor-secret")
            .text.strip()
        )
        totp = pyotp.TOTP(secret_code)
        valid_code = totp.now()

        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys(valid_code)

        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(2)

        # Verify 2FA is enabled
        response = self.clients[0].get("/api/user/two-factor/status/")
        data = response.json()
        self.assertTrue(data["enabled"])

        # Now disable it
        disable_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "disable-two-factor"))
        )
        disable_btn.click()

        time.sleep(1)

        # Click confirm disable button in dialog
        disable_confirm_btn = WebDriverWait(
            self.drivers[0], self.wait_time
        ).until(EC.element_to_be_clickable((By.ID, "two-factor-disable-btn")))
        disable_confirm_btn.click()

        time.sleep(2)

        # Verify 2FA is disabled
        response = self.clients[0].get("/api/user/two-factor/status/")
        data = response.json()
        self.assertFalse(data["enabled"])

    def test_two_factor_login_flow(self):
        """Test login with two-factor authentication enabled."""
        # Enable 2FA for user2
        self.login_user(self.user2, self.drivers[0], self.clients[0])
        self.drivers[0].get(f"{self.live_server_url}/profile/")

        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        secret_code = (
            self.drivers[0]
            .find_element(By.CLASS_NAME, "two-factor-secret")
            .text.strip()
        )
        totp = pyotp.TOTP(secret_code)
        valid_code = totp.now()

        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys(valid_code)

        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(2)

        # Logout
        self.logout_user(self.drivers[0], self.clients[0])

        # Try to login
        self.drivers[0].get(f"{self.live_server_url}/")

        # Enter username and password
        login_input = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located((By.ID, "id-login"))
        )
        login_input.send_keys("testuser2")

        password_input = self.drivers[0].find_element(By.ID, "id-password")
        password_input.send_keys("testpass456")

        submit_btn = self.drivers[0].find_element(By.ID, "login-submit")
        submit_btn.click()

        # Wait for 2FA dialog to appear
        time.sleep(2)

        # Check that 2FA dialog appeared
        two_fa_dialog = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located(
                (By.CLASS_NAME, "two-factor-dialog")
            )
        )
        self.assertIsNotNone(two_fa_dialog)

        # Generate and enter valid TOTP code
        valid_code = totp.now()
        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys(valid_code)

        # Verify
        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        # Wait for login to complete - should be redirected to dashboard
        WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located((By.ID, "user-preferences"))
        )

    def test_two_factor_login_invalid_code(self):
        """Test login with invalid 2FA code."""
        # Enable 2FA for user2
        self.login_user(self.user2, self.drivers[0], self.clients[0])
        self.drivers[0].get(f"{self.live_server_url}/profile/")

        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        secret_code = (
            self.drivers[0]
            .find_element(By.CLASS_NAME, "two-factor-secret")
            .text.strip()
        )
        totp = pyotp.TOTP(secret_code)
        valid_code = totp.now()

        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys(valid_code)

        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(2)

        # Logout
        self.logout_user(self.drivers[0], self.clients[0])

        # Try to login
        self.drivers[0].get(f"{self.live_server_url}/")

        login_input = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located((By.ID, "id-login"))
        )
        login_input.send_keys("testuser2")

        password_input = self.drivers[0].find_element(By.ID, "id-password")
        password_input.send_keys("testpass456")

        submit_btn = self.drivers[0].find_element(By.ID, "login-submit")
        submit_btn.click()

        # Wait for 2FA dialog
        time.sleep(2)

        # Enter invalid code
        code_input = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located((By.ID, "two-factor-code"))
        )
        code_input.clear()
        code_input.send_keys("000000")  # Invalid code

        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(1)

        # Dialog should still be open
        two_fa_dialog = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-dialog"
        )
        self.assertIsNotNone(two_fa_dialog)

    def test_two_factor_multiple_failed_attempts(self):
        """Test that multiple failed 2FA attempts lock out the user."""
        # Enable 2FA
        self.login_user(self.user2, self.drivers[0], self.clients[0])
        self.drivers[0].get(f"{self.live_server_url}/profile/")

        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        secret_code = (
            self.drivers[0]
            .find_element(By.CLASS_NAME, "two-factor-secret")
            .text.strip()
        )
        totp = pyotp.TOTP(secret_code)
        valid_code = totp.now()

        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys(valid_code)

        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(2)

        # Logout
        self.logout_user(self.drivers[0], self.clients[0])

        # Try to login with failed 2FA attempts
        self.drivers[0].get(f"{self.live_server_url}/")

        login_input = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.presence_of_element_located((By.ID, "id-login"))
        )
        login_input.send_keys("testuser2")

        password_input = self.drivers[0].find_element(By.ID, "id-password")
        password_input.send_keys("testpass456")

        submit_btn = self.drivers[0].find_element(By.ID, "login-submit")
        submit_btn.click()

        time.sleep(2)

        # Make 3 failed attempts
        for i in range(3):
            code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
            code_input.clear()
            code_input.send_keys("000000")

            verify_btn = self.drivers[0].find_element(
                By.ID, "two-factor-verify-btn"
            )
            verify_btn.click()

            time.sleep(1)

            # Check attempts warning on last attempt
            if i == 2:
                warning = self.drivers[0].find_element(
                    By.CLASS_NAME, "attempts-warning"
                )
                self.assertIsNotNone(warning)

    def test_two_factor_code_format_validation(self):
        """Test that code format is validated."""
        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        # Try with too short code
        code_input = self.drivers[0].find_element(By.ID, "two-factor-code")
        code_input.clear()
        code_input.send_keys("123")

        verify_btn = self.drivers[0].find_element(
            By.ID, "two-factor-verify-btn"
        )
        verify_btn.click()

        time.sleep(1)

        # Dialog should still be open
        dialog = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-dialog"
        )
        self.assertIsNotNone(dialog)

        # Try with too long code
        code_input.clear()
        code_input.send_keys("123456789")

        verify_btn.click()

        time.sleep(1)

        # Dialog should still be open
        dialog = self.drivers[0].find_element(
            By.CLASS_NAME, "two-factor-dialog"
        )
        self.assertIsNotNone(dialog)

    def test_two_factor_qr_code_generation(self):
        """Test that QR code is properly generated."""
        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        # Check QR code image
        qr_img = self.drivers[0].find_element(
            By.CSS_SELECTOR, ".two-factor-qr-container img"
        )
        self.assertIsNotNone(qr_img)

        # Check that the QR code image source contains the provisioning URI
        img_src = qr_img.get_attribute("src")
        self.assertIn("api.qrserver.com", img_src)
        self.assertIn("data=", img_src)

    def test_two_factor_totp_codes_change_over_time(self):
        """Test that TOTP codes change over time."""
        setup_btn = WebDriverWait(self.drivers[0], self.wait_time).until(
            EC.element_to_be_clickable((By.ID, "setup-two-factor"))
        )
        setup_btn.click()

        time.sleep(1)

        secret_code = (
            self.drivers[0]
            .find_element(By.CLASS_NAME, "two-factor-secret")
            .text.strip()
        )
        totp = pyotp.TOTP(secret_code)

        code1 = totp.now()
        time.sleep(31)  # Wait for next time window
        code2 = totp.now()

        # Codes should be different
        self.assertNotEqual(code1, code2)

        # Both codes should be valid for their respective time windows
        self.assertTrue(totp.verify(code1, valid_window=-1))
        self.assertTrue(totp.verify(code2))

    def tearDown(self):
        """Clean up after tests."""
        # Logout users
        for driver in self.drivers:
            driver.delete_cookie("sessionid")
            self.leave_site(driver)

        # Clean up test users
        User = get_user_model()
        User.objects.filter(username__in=["testuser1", "testuser2"]).delete()

        super().tearDown()
