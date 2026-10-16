pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }

    environment {
        NEXUS_URL = 'http://192.168.0.106:8081'
        NEXUS_REPO = 'kijaniokiosk-npm'
        NEXUS_CREDENTIAL_ID = 'nexus-creds'
    }

    stages {
        stage('Set Version') {
            steps {
                script {
                    // This is the standard, approved Jenkins way to get the Git hash
                    env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.VERSION = "1.0.0-${env.GIT_SHA}"
                    echo "Building version: ${env.VERSION}"
                }
            }
        }

        stage('Lint') {
            steps {
                echo 'Running Lint stage...'
                sh 'npm install'
                sh 'npm run lint'
            }
        }

        stage('Build') {
            steps {
                echo 'Running Build stage...'
                sh 'npm run build'
            }
        }

        stage('Verify') {
            parallel {
                stage('Test') {
                    steps {
                        echo 'Running Tests...'
                        sh 'npm test'
                    }
                }
                stage('Security Audit') {
                    steps {
                        echo 'Running Security Audit...'
                        sh 'npm audit --audit-level=high'
                    }
                }
            }
        }

        stage('Archive') {
            steps {
                echo 'Archiving build artifacts...'
                sh "tar -czf kijaniokiosk-payments-${VERSION}.tar.gz dist/ package.json"
                archiveArtifacts artifacts: "kijaniokiosk-payments-${VERSION}.tar.gz", fingerprint: true
            }
        }

        stage('Publish') {
            steps {
                echo 'Publishing to Nexus...'
                withCredentials([usernamePassword(credentialsId: "${NEXUS_CREDENTIAL_ID}", usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    sh '''
                        echo "//${NEXUS_URL}/repository/${NEXUS_REPO}/:_auth=$(echo -n ${NEXUS_USER}:${NEXUS_PASS} | base64)" > .npmrc
                        echo "//${NEXUS_URL}/repository/${NEXUS_REPO}/:always-auth=true" >> .npmrc
                        npm publish --registry ${NEXUS_URL}/repository/${NEXUS_REPO}/
                        rm -f .npmrc
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo "SUCCESS: Artifact published successfully."
            echo "Nexus URL: ${NEXUS_URL}/repository/${NEXUS_REPO}/kijaniokiosk-payments/-/kijaniokiosk-payments-${VERSION}.tgz"
        }
        failure {
            echo "FAILURE: Pipeline failed at stage: ${currentBuild.currentResult}"
        }
        changed {
            echo "CHANGED: Build status changed from ${currentBuild.previousResult} to ${currentBuild.currentResult}"
        }
    }
}
