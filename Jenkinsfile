pipeline {
    agent {
        docker {
            image 'node:18'
            args '-e HOME=/tmp -e npm_config_cache=/tmp/.npm'
        }
    }

    environment {
        NEXUS_HOST          = '192.168.0.106:8081'
        NEXUS_REPO          = 'kijaniokiosk-npm'
        NEXUS_CREDENTIAL_ID = 'nexus-creds'
    }

    stages {
        stage('Set Version') {
            steps {
                script {
                    env.GIT_SHA = env.GIT_COMMIT.take(7)
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
                withCredentials([usernamePassword(credentialsId: "${NEXUS_CREDENTIAL_ID}",
                                                  usernameVariable: 'NEXUS_USER',
                                                  passwordVariable: 'NEXUS_PASS')]) {
                    sh '''
                        npm version "$VERSION" --no-git-tag-version --allow-same-version

                        AUTH=$(printf '%s:%s' "$NEXUS_USER" "$NEXUS_PASS" | base64 | tr -d '\\n')
                        echo "//${NEXUS_HOST}/repository/${NEXUS_REPO}/:_auth=${AUTH}" > .npmrc
                        echo "//${NEXUS_HOST}/repository/${NEXUS_REPO}/:always-auth=true" >> .npmrc

                        npm publish --registry "http://${NEXUS_HOST}/repository/${NEXUS_REPO}/"
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
            echo "Nexus URL: http://${NEXUS_HOST}/repository/${NEXUS_REPO}/kijaniokiosk-payments/-/kijaniokiosk-payments-${VERSION}.tgz"
        }
        failure {
            echo "FAILURE: Pipeline failed. Check the red stage in Stage View."
        }
        changed {
            echo "CHANGED: Build status changed, now ${currentBuild.currentResult}"
        }
    }
}
