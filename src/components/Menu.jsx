import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Link from '@mui/material/Link';

const Menu = () => {
  const [searchParams] = useSearchParams();
  const isV2 = searchParams.get('v2') === '1';
  const navigate = useNavigate();

  const handleSearch = () => navigate('/?v2=1');

  return (
    <AppBar sx={{ backgroundColor: '#1e2028', boxShadow: 'none' }} position="fixed" enableColorOnDark elevation={0}>
      <Toolbar>
        <Box display="flex" flexGrow={1} alignItems="center">
          <Link
            component={RouterLink}
            to={isV2 ? '/?v2=1' : '/'}
            sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { opacity: 0.75 }, '& span': { verticalAlign: 'top' } }}
          >
            <Typography
              component="span"
              color="textPrimary"
              sx={{ fontSize: { xs: '1.2rem', sm: '1.45rem' }, fontWeight: 600, letterSpacing: '-0.5px' }}
            >
              {window.location.toString().includes('bgpeen') ? 'bgpeen' : 'goodat.games'}
            </Typography>
            <Typography component="span" variant="subtitle2" color="textPrimary" sx={{ fontSize: { xs: '0.55rem', sm: '0.75rem' } }}>
              &nbsp;beta
            </Typography>
          </Link>

          {isV2 && (
            <>
              <Button
                onClick={handleSearch}
                sx={{
                  ml: 'auto',
                  display: { xs: 'none', sm: 'flex' },
                  background: 'none',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#999',
                  fontSize: '0.82rem',
                  padding: '7px 14px',
                  textTransform: 'none',
                  fontFamily: 'inherit',
                  maxWidth: 420,
                  justifyContent: 'flex-start',
                  '&:hover': { borderColor: '#666', color: '#ccc', background: 'none' },
                }}
              >
                Search games and scores...
              </Button>
              <IconButton
                onClick={handleSearch}
                sx={{
                  ml: 'auto',
                  display: { xs: 'flex', sm: 'none' },
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#999',
                  padding: '7px 9px',
                  '&:hover': { borderColor: '#666', color: '#ccc' },
                }}
              >
                <SearchIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
